package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type Authenticator struct {
	logger *zap.Logger

	jwks       *keyfunc.JWKS
	jwksCancel context.CancelFunc

	// user-id extraction
	claimOrder []string
}

type Options struct {
	Logger     *zap.Logger
	ClaimOrder []string // 例: []string{"email","preferred_username","sub"}
}

func NewAuthenticatorFromEnv(opts Options) (*Authenticator, error) {
	l := opts.Logger
	if l == nil {
		l = zap.NewNop()
	}
	order := opts.ClaimOrder
	if len(order) == 0 {
		order = []string{"email", "preferred_username", "sub"}
	}

	jwksURL, err := buildJWKSURL()
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithCancel(context.Background())
	j, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		cancel()
		return nil, err
	}

	return &Authenticator{
		logger:     l,
		jwks:       j,
		jwksCancel: cancel,
		claimOrder: order,
	}, nil
}

func (a *Authenticator) Close() {
	if a.jwksCancel != nil {
		a.jwksCancel()
	}
}

func buildJWKSURL() (string, error) {
	if v := strings.TrimSpace(os.Getenv("KEYCLOAK_JWKS_URL")); v != "" {
		return v, nil
	}

	base := strings.TrimSpace(os.Getenv("KEYCLOAK_BASE_URL"))
	if base == "" {
		base = "http://uam-service.default.svc.cluster.local"
	}
	realm := strings.TrimSpace(os.Getenv("KEYCLOAK_REALM"))
	if realm == "" {
		realm = "mockten-realm-dev"
	}

	base = strings.TrimRight(base, "/")
	if realm == "" {
		return "", errors.New("KEYCLOAK_REALM is empty")
	}
	return base + "/realms/" + realm + "/protocol/openid-connect/certs", nil
}

func bearerTokenFromHeader(h string) (string, bool) {
	v := strings.TrimSpace(h)
	if v == "" {
		return "", false
	}
	parts := strings.SplitN(v, " ", 2)
	if len(parts) != 2 {
		return "", false
	}
	if !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}
	t := strings.TrimSpace(parts[1])
	if t == "" {
		return "", false
	}
	return t, true
}

func jwtHeaderInfo(tokenStr string) (string, string) {
	p := strings.Split(tokenStr, ".")
	if len(p) < 2 {
		return "", ""
	}
	b, err := base64.RawURLEncoding.DecodeString(p[0])
	if err != nil {
		return "", ""
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return "", ""
	}
	kid, _ := m["kid"].(string)
	alg, _ := m["alg"].(string)
	return strings.TrimSpace(kid), strings.TrimSpace(alg)
}

// これが「Authorization: Bearer」から user-id を取り出す本体
func (a *Authenticator) UserIDFromGinContext(c *gin.Context) (string, error) {
	tokenStr, ok := bearerTokenFromHeader(c.GetHeader("Authorization"))
	if !ok {
		return "", errors.New("missing bearer token")
	}

	kid, alg := jwtHeaderInfo(tokenStr)

	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{"RS256", "RS384", "RS512"}),
		jwt.WithLeeway(30*time.Second),
	)

	var claims jwt.MapClaims
	tok, err := parser.ParseWithClaims(tokenStr, &claims, a.jwks.Keyfunc)
	if err != nil {
		a.logger.Warn("JWT parse failed", zap.String("kid", kid), zap.String("alg", alg), zap.Error(err))
		return "", err
	}
	if !tok.Valid {
		a.logger.Warn("JWT invalid", zap.String("kid", kid), zap.String("alg", alg))
		return "", errors.New("invalid token")
	}

	for _, k := range a.claimOrder {
		if v, ok := claims[k]; ok {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return strings.TrimSpace(s), nil
			}
		}
	}
	return "", errors.New("no usable user identifier in token claims")
}

// ---- Gin middleware (共通で使える形) ----

const CtxUserIDKey = "user_id"

func (a *Authenticator) RequireUserID() gin.HandlerFunc {
	return func(c *gin.Context) {
		uid, err := a.UserIDFromGinContext(c)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		c.Set(CtxUserIDKey, uid)
		c.Next()
	}
}

func GetUserID(c *gin.Context) (string, bool) {
	v, ok := c.Get(CtxUserIDKey)
	if !ok {
		return "", false
	}
	s, ok := v.(string)
	return s, ok && s != ""
}

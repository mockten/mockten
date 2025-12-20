package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const (
	port = ":50052"
)

var (
	logger     *zap.Logger
	jwks       keyfunc.Keyfunc
	jwksCancel context.CancelFunc
)

type GeoResponse struct {
	GeoID        string   `json:"geoId"`
	CountryCode  string   `json:"countryCode"`
	PostalCode   string   `json:"postalCode"`
	Prefecture   string   `json:"prefecture"`
	City         string   `json:"city"`
	Town         string   `json:"town"`
	BuildingName string   `json:"buildingName"`
	RoomNumber   string   `json:"roomNumber"`
	Latitude     *float64 `json:"latitude"`
	Longitude    *float64 `json:"longitude"`
}

type ReviewResponse struct {
	ReviewID string    `json:"reviewId"`
	UserID   string    `json:"userId"`
	UserName string    `json:"userName"`
	Rating   int       `json:"rating"`
	Comment  string    `json:"comment"`
	Created  time.Time `json:"createdAt"`
}

type ItemDetailResponse struct {
	ProductID         string           `json:"productId"`
	ProductName       string           `json:"productName"`
	SellerName        string           `json:"sellerName"`
	Price             int              `json:"price"`
	CategoryName      string           `json:"categoryName"`
	ProductCondition  string           `json:"productCondition"`
	InStock           bool             `json:"inStock"`
	Stocks            int              `json:"stocks"`
	Summary           string           `json:"summary"`
	Geo               GeoResponse      `json:"geo"`
	RegistDay         time.Time        `json:"registDay"`
	LastUpdate        time.Time        `json:"lastUpdate"`
	AvgReview         float64          `json:"avgReview"`
	ReviewCount       int              `json:"reviewCount"`
	VendorUserName    string           `json:"vendorUserName"`
	VendorDescription string           `json:"vendorDescription"`
	Reviews           []ReviewResponse `json:"reviews,omitempty"`
}

type ItemReviewsResponse struct {
	ProductID string           `json:"productId"`
	Total     int              `json:"total"`
	Limit     int              `json:"limit"`
	Offset    int              `json:"offset"`
	Reviews   []ReviewResponse `json:"reviews"`
}

type CreateReviewRequest struct {
	ProductID string `json:"productId"`
	Rating    int    `json:"rating"`
	Comment   string `json:"comment"`
}

type CreateReviewResponse struct {
	ProductID   string    `json:"productId"`
	ReviewID    string    `json:"reviewId"`
	UserID      string    `json:"userId"`
	UserName    string    `json:"userName"`
	Rating      int       `json:"rating"`
	Comment     string    `json:"comment"`
	CreatedAt   time.Time `json:"createdAt"`
	AvgReview   float64   `json:"avgReview"`
	ReviewCount int       `json:"reviewCount"`
}

func waitForMySQL(db *sql.DB, logger *zap.Logger) {
	maxAttempts := 20
	for i := 1; i <= maxAttempts; i++ {
		err := db.Ping()
		if err == nil {
			logger.Info("MySQL is ready.")
			return
		}
		logger.Warn("Waiting for MySQL to be ready...", zap.Int("attempt", i), zap.Error(err))
		time.Sleep(3 * time.Second)
	}
	logger.Fatal("MySQL did not become ready in time.")
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

func initJWKS(jwksURL string) error {
	ctx, cancel := context.WithCancel(context.Background())
	jwksCancel = cancel

	k, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return err
	}
	jwks = k
	return nil
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

func getUserIDFromAccessToken(c *gin.Context) (string, error) {
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
	tok, err := parser.ParseWithClaims(tokenStr, &claims, jwks.Keyfunc)
	if err != nil {
		logger.Warn("JWT parse failed", zap.String("kid", kid), zap.String("alg", alg), zap.Error(err))
		return "", err
	}
	if !tok.Valid {
		logger.Warn("JWT invalid", zap.String("kid", kid), zap.String("alg", alg))
		return "", errors.New("invalid token")
	}

	if v, ok := claims["email"]; ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s), nil
		}
	}
	if v, ok := claims["preferred_username"]; ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s), nil
		}
	}
	if v, ok := claims["sub"]; ok {
		if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
			return strings.TrimSpace(s), nil
		}
	}

	return "", errors.New("no usable user identifier in token claims")
}

func fetchReviews(db *sql.DB, productID string, limit int, offset int) ([]ReviewResponse, int, error) {
	countQuery := `
SELECT COUNT(*)
FROM Review r
WHERE r.product_id = ?
  AND r.status = 'active'
`
	var total int
	if err := db.QueryRow(countQuery, productID).Scan(&total); err != nil {
		return nil, 0, err
	}

	listQuery := `
SELECT
  r.review_id,
  r.user_id,
  COALESCE(NULLIF(ue.FIRST_NAME, ''), 'Anonymous') AS user_name,
  r.rating,
  COALESCE(r.comment, '') AS comment,
  r.created_at
FROM Review r
LEFT JOIN USER_ENTITY ue ON r.user_id = ue.EMAIL
WHERE r.product_id = ?
  AND r.status = 'active'
ORDER BY r.created_at DESC
LIMIT ? OFFSET ?
`
	rows, err := db.Query(listQuery, productID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	reviews := make([]ReviewResponse, 0, limit)
	for rows.Next() {
		var rr ReviewResponse
		if err := rows.Scan(&rr.ReviewID, &rr.UserID, &rr.UserName, &rr.Rating, &rr.Comment, &rr.Created); err != nil {
			return nil, 0, err
		}
		reviews = append(reviews, rr)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

func getItemReviewsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Param("productId")
		if productID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing productId path parameter"})
			return
		}

		limit := 20
		offset := 0

		if v := c.Query("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 200 {
				limit = n
			}
		}
		if v := c.Query("offset"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n >= 0 {
				offset = n
			}
		}

		reviews, total, err := fetchReviews(db, productID, limit, offset)
		if err != nil {
			logger.Error("DB query failed (reviews)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		c.JSON(http.StatusOK, ItemReviewsResponse{
			ProductID: productID,
			Total:     total,
			Limit:     limit,
			Offset:    offset,
			Reviews:   reviews,
		})
	}
}

func getItemDetailHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Param("productId")
		if productID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing productId path parameter"})
			return
		}

		query := `
SELECT
  p.product_id,
  p.product_name,
  COALESCE(s.seller_name, ue.USERNAME) AS seller_name,
  p.price,
  c.category_name,
  p.product_condition,
  COALESCE(t.stocks, 0) AS stocks,
  p.summary,
  p.regist_day,
  p.last_update,
  p.geo_id,
  g.country_code,
  g.postal_code,
  g.prefecture,
  g.city,
  g.town,
  g.building_name,
  g.room_number,
  g.latitude,
  g.longitude,
  p.avg_review,
  p.review_count,
  ue.USERNAME AS vendor_username,
  COALESCE(ua.VALUE, '') AS vendor_description
FROM Product p
JOIN Category c ON p.category_id = c.category_id
LEFT JOIN Stock t ON p.product_id = t.product_id
LEFT JOIN Seller s ON p.seller_id = s.seller_id
LEFT JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
LEFT JOIN USER_ATTRIBUTE ua ON ue.ID = ua.USER_ID AND ua.NAME = 'description'
LEFT JOIN Geo g ON p.geo_id = g.user_id
WHERE p.product_id = ?
LIMIT 1
`

		var (
			resp ItemDetailResponse

			geoID string

			countryCode  sql.NullString
			postalCode   sql.NullString
			prefecture   sql.NullString
			city         sql.NullString
			town         sql.NullString
			buildingName sql.NullString
			roomNumber   sql.NullString
			latitude     sql.NullFloat64
			longitude    sql.NullFloat64

			avgReview         sql.NullFloat64
			reviewCount       sql.NullInt64
			vendorUserName    sql.NullString
			vendorDescription sql.NullString
		)

		err := db.QueryRow(query, productID).Scan(
			&resp.ProductID,
			&resp.ProductName,
			&resp.SellerName,
			&resp.Price,
			&resp.CategoryName,
			&resp.ProductCondition,
			&resp.Stocks,
			&resp.Summary,
			&resp.RegistDay,
			&resp.LastUpdate,
			&geoID,
			&countryCode,
			&postalCode,
			&prefecture,
			&city,
			&town,
			&buildingName,
			&roomNumber,
			&latitude,
			&longitude,
			&avgReview,
			&reviewCount,
			&vendorUserName,
			&vendorDescription,
		)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
				return
			}
			logger.Error("DB query failed (detail)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		resp.InStock = resp.Stocks > 0

		resp.Geo = GeoResponse{
			GeoID:        geoID,
			CountryCode:  "",
			PostalCode:   "",
			Prefecture:   "",
			City:         "",
			Town:         "",
			BuildingName: "",
			RoomNumber:   "",
			Latitude:     nil,
			Longitude:    nil,
		}

		if countryCode.Valid {
			resp.Geo.CountryCode = countryCode.String
		}
		if postalCode.Valid {
			resp.Geo.PostalCode = postalCode.String
		}
		if prefecture.Valid {
			resp.Geo.Prefecture = prefecture.String
		}
		if city.Valid {
			resp.Geo.City = city.String
		}
		if town.Valid {
			resp.Geo.Town = town.String
		}
		if buildingName.Valid {
			resp.Geo.BuildingName = buildingName.String
		}
		if roomNumber.Valid {
			resp.Geo.RoomNumber = roomNumber.String
		}
		if latitude.Valid {
			v := latitude.Float64
			resp.Geo.Latitude = &v
		}
		if longitude.Valid {
			v := longitude.Float64
			resp.Geo.Longitude = &v
		}

		resp.AvgReview = 0.0
		resp.ReviewCount = 0
		if avgReview.Valid {
			resp.AvgReview = avgReview.Float64
		}
		if reviewCount.Valid {
			resp.ReviewCount = int(reviewCount.Int64)
		}

		resp.VendorUserName = ""
		resp.VendorDescription = ""
		if vendorUserName.Valid {
			resp.VendorUserName = vendorUserName.String
		}
		if vendorDescription.Valid {
			resp.VendorDescription = vendorDescription.String
		}

		reviewsPreview, _, err := fetchReviews(db, productID, 2, 0)
		if err != nil {
			logger.Error("DB query failed (reviews preview)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		if len(reviewsPreview) > 0 {
			resp.Reviews = reviewsPreview
		}

		c.JSON(http.StatusOK, resp)
	}
}

func fetchUserDisplayName(tx *sql.Tx, userID string) (string, error) {
	q := `SELECT COALESCE(NULLIF(FIRST_NAME, ''), 'Anonymous') FROM USER_ENTITY WHERE EMAIL = ? LIMIT 1`
	var name string
	err := tx.QueryRow(q, userID).Scan(&name)
	if err != nil {
		if err == sql.ErrNoRows {
			return "Anonymous", nil
		}
		return "", err
	}
	if strings.TrimSpace(name) == "" {
		return "Anonymous", nil
	}
	return name, nil
}

func upsertReview(tx *sql.Tx, reviewID string, productID string, userID string, rating int, comment string) (string, time.Time, int, bool, bool, error) {
	var existingID string
	var createdAt time.Time
	var prevRating int
	var prevStatus string

	sel := `SELECT review_id, created_at, rating, status FROM Review WHERE product_id = ? AND user_id = ? LIMIT 1 FOR UPDATE`
	err := tx.QueryRow(sel, productID, userID).Scan(&existingID, &createdAt, &prevRating, &prevStatus)
	if err != nil && err != sql.ErrNoRows {
		return "", time.Time{}, 0, false, false, err
	}

	if err == sql.ErrNoRows {
		ins := `
INSERT INTO Review (review_id, product_id, user_id, rating, comment, status)
VALUES (?, ?, ?, ?, ?, 'active')
`
		_, err := tx.Exec(ins, reviewID, productID, userID, rating, comment)
		if err != nil {
			return "", time.Time{}, 0, false, false, err
		}
		sel2 := `SELECT created_at FROM Review WHERE review_id = ? LIMIT 1`
		if err := tx.QueryRow(sel2, reviewID).Scan(&createdAt); err != nil {
			return "", time.Time{}, 0, false, false, err
		}
		return reviewID, createdAt, 0, false, true, nil
	}

	upd := `
UPDATE Review
SET rating = ?, comment = ?, status = 'active'
WHERE review_id = ?
`
	_, err = tx.Exec(upd, rating, comment, existingID)
	if err != nil {
		return "", time.Time{}, 0, false, false, err
	}

	wasActive := strings.EqualFold(strings.TrimSpace(prevStatus), "active")
	return existingID, createdAt, prevRating, wasActive, false, nil
}

func updateProductRatingIncremental(tx *sql.Tx, productID string, newRating int, prevRating int, wasActive bool, isNew bool) (float64, int, error) {
	var oldAvg float64
	var oldCnt int

	sel := `SELECT CAST(avg_review AS DECIMAL(10,4)) + 0.0, review_count FROM Product WHERE product_id = ? LIMIT 1 FOR UPDATE`
	if err := tx.QueryRow(sel, productID).Scan(&oldAvg, &oldCnt); err != nil {
		return 0.0, 0, err
	}

	var newAvg float64
	var newCnt int

	if isNew || !wasActive {
		newCnt = oldCnt + 1
		if newCnt <= 0 {
			newCnt = 1
		}
		newAvg = (oldAvg*float64(oldCnt) + float64(newRating)) / float64(newCnt)
	} else {
		newCnt = oldCnt
		if newCnt <= 0 {
			newCnt = 1
		}
		newAvg = (oldAvg*float64(oldCnt) - float64(prevRating) + float64(newRating)) / float64(newCnt)
	}

	newAvg = math.Round(newAvg*10.0) / 10.0

	upd := `UPDATE Product SET avg_review = ?, review_count = ? WHERE product_id = ?`
	if _, err := tx.Exec(upd, newAvg, newCnt, productID); err != nil {
		return 0.0, 0, err
	}

	return newAvg, newCnt, nil
}

func postItemReviewHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := getUserIDFromAccessToken(c)
		if err != nil {
			logger.Warn("Unauthorized request", zap.Error(err))
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}

		var req CreateReviewRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}
		req.ProductID = strings.TrimSpace(req.ProductID)
		req.Comment = strings.TrimSpace(req.Comment)

		if req.ProductID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing productId"})
			return
		}
		if req.Rating < 1 || req.Rating > 5 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "rating must be between 1 and 5"})
			return
		}
		if len(req.Comment) > 4000 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "comment too long"})
			return
		}

		tx, err := db.Begin()
		if err != nil {
			logger.Error("DB begin failed", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}
		defer func() { _ = tx.Rollback() }()

		var exists int
		if err := tx.QueryRow(`SELECT 1 FROM Product WHERE product_id = ? LIMIT 1`, req.ProductID).Scan(&exists); err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
				return
			}
			logger.Error("DB query failed (product exists)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		newReviewID := uuid.NewString()
		reviewID, createdAt, prevRating, wasActive, isNew, err := upsertReview(tx, newReviewID, req.ProductID, userID, req.Rating, req.Comment)
		if err != nil {
			logger.Error("DB upsert failed (review)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		avg, cnt, err := updateProductRatingIncremental(tx, req.ProductID, req.Rating, prevRating, wasActive, isNew)
		if err != nil {
			logger.Error("DB update failed (product rating incremental)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		userName, err := fetchUserDisplayName(tx, userID)
		if err != nil {
			logger.Error("DB query failed (user display name)", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		if err := tx.Commit(); err != nil {
			logger.Error("DB commit failed", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		c.JSON(http.StatusOK, CreateReviewResponse{
			ProductID:   req.ProductID,
			ReviewID:    reviewID,
			UserID:      userID,
			UserName:    userName,
			Rating:      req.Rating,
			Comment:     req.Comment,
			CreatedAt:   createdAt,
			AvgReview:   avg,
			ReviewCount: cnt,
		})
	}
}

func main() {
	var err error

	environment := os.Getenv("MOCKTEN_ENV")

	if environment == "development" || environment == "" {
		config := zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		logger, err = config.Build()
	} else {
		config := zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		logger, err = config.Build()
	}

	if err != nil {
		log.Println("failed to set up zap logger.")
		panic(err)
	}

	defer func() { _ = logger.Sync() }()

	jwksURL, err := buildJWKSURL()
	if err != nil {
		logger.Fatal("failed to build jwks url", zap.Error(err))
	}
	logger.Info("JWKS URL", zap.String("jwks_url", jwksURL))

	if err := initJWKS(jwksURL); err != nil {
		logger.Fatal("failed to init jwks", zap.String("jwks_url", jwksURL), zap.Error(err))
	}
	defer func() {
		if jwksCancel != nil {
			jwksCancel()
		}
	}()

	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}

	waitForMySQL(db, logger)
	defer db.Close()

	router := gin.Default()

	router.GET("/v1/item/detail/:productId", getItemDetailHandler(db))
	router.GET("/v1/item/reviews/:productId", getItemReviewsHandler(db))
	router.POST("/v1/item/review", postItemReviewHandler(db))

	_ = router.Run(port)
}

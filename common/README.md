# common

Shared Go libraries used across the mockten backend services.

`common` holds reusable, cross-cutting code so the individual Go services don't each reimplement it. Today it centralizes Keycloak JWT authentication.

## Layout

```
common/
├── auth/
│   ├── auth.go        # Authenticator: JWKS setup, JWT verification, Gin helpers
│   └── auth_test.go   # unit tests (bearer-token parsing)
├── go.mod / go.sum
```

## Package `auth`

An `Authenticator` verifies Keycloak-issued JWTs against the realm's JWKS and exposes helpers to pull the user id out of a request.

| Symbol | Purpose |
|--------|---------|
| `NewAuthenticatorFromEnv(opts)` | Build an authenticator from `KEYCLOAK_*` env vars (fetches the JWKS). |
| `buildJWKSURL()` | Derive the JWKS endpoint URL from base URL + realm. |
| `bearerTokenFromHeader(h)` | Extract the bearer token from an `Authorization` header. |
| `jwtHeaderInfo(tokenStr)` | Inspect a JWT's header (alg / kid). |
| `UserIDFromGinContext(c)` / `RequireUserID()` | Resolve/enforce the authenticated user id in a Gin handler. |
| `GetUserID(c)` | Read the user id previously stored on the Gin context. |

## Running tests

```sh
cd common
go test ./...
```

Unit tests cover `bearerTokenFromHeader`. Consumed by the Go services (e.g. [`cart`](../cart)) via the shared module path `github.com/mockten/mockten/common`.

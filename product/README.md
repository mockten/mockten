# product

Product catalog service (Go, Gin).

`product` serves everything about an individual product to the storefront: detail pages, customer reviews, the wishlist (favorites), browsing-history tracking, and co-purchase recommendations. It reads from and writes to MySQL, and authenticates callers by verifying Keycloak-issued JWTs.

## Layout

```
product/
├── product.go        # entrypoint, JWT verification, all HTTP handlers, routing
├── product_test.go   # unit tests (bearer-token parsing)
├── go.mod / go.sum
└── Dockerfile
```

Everything lives in `product.go`: JWKS/JWT verification helpers, the Gin router, and one handler per endpoint. The service listens on `:50052`.

## Endpoints (internal `/v1`, exposed via Kong as `/api/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/item/detail/:productId` | Full product detail (name, price, images, stock, average rating). |
| GET | `/v1/item/reviews/:productId` | Paginated customer reviews (`limit` / `offset`). |
| POST | `/v1/item/review` | Upsert a review and atomically recompute the product's average rating in a transaction. |
| GET | `/v1/fav` | The authenticated user's wishlist (hydrated with product data). |
| POST | `/v1/fav/:productId` | Add a product to the wishlist (upsert). |
| DELETE | `/v1/fav/:productId` | Remove a product from the wishlist. |
| POST | `/v1/browsing-history/:productId` | Record a product-page view for the user. |
| GET | `/v1/browsing-history/recommendations` | Highest-rated products in the categories the user recently viewed. |
| GET | `/v1/co-purchase` | Products frequently bought by users who bought the target product (with same-category fallback). |

## Authentication

Requests carry a Bearer JWT (forwarded by Kong). `bearerTokenFromHeader` extracts the token and `jwtHeaderInfo` inspects it; signatures are verified against the Keycloak JWKS. The user id is taken from the token claims.

## Configuration

| Env var | Purpose |
|---------|---------|
| `MYSQL_DSN` | MySQL connection string. |
| `KEYCLOAK_JWKS_URL` | Explicit JWKS URL (otherwise derived from the two below). |
| `KEYCLOAK_BASE_URL` | Keycloak base URL used to build the JWKS URL. |
| `KEYCLOAK_REALM` | Keycloak realm name used to build the JWKS URL. |
| `MOCKTEN_ENV` | Environment selector (dev/prod behavior). |

Product images are resolved from MinIO via `getImageURL(productID, categoryID)`, falling back to a placeholder when the object is missing.

## Running tests

```sh
cd product
go test ./...
```

Unit tests cover `bearerTokenFromHeader`. Tests run automatically in CI (`build_product` job).

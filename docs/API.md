# API Reference

> Generated from the platform's live Kong routing (`apigw/kong.yaml`) and the Developer Dashboard's tested API Specifications. Every method/path, backend target, description, input schema and response schema below matches the running services. Regenerate rather than hand-edit (see the repo's generator).

Base host: all paths are relative to the gateway (e.g. `http://localhost` locally). A `Bearer` token in the `Authorization` header is required wherever the input schema lists it.

## `GET /api/stats`

**Backend target:** `http://mockten-dashboard:3001/api/stats`

Returns API gateway telemetry derived from Kong's access log. By default returns both `topApis` (most requested endpoints) and `slowApis` (highest average latency, min 3 samples). Pass `type=top` or `type=slow` to get a single array. Served by the monitoring dashboard service.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `type` | query | string | No | Filter: "top" = top requested, "slow" = slowest endpoints. Omit for both. |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `topApis` | array | Most requested endpoints (present when type omitted or type=top) |
| `topApis[].method` | string | HTTP method (GET, POST, …) |
| `topApis[].path` | string | Normalized request path (UUIDs replaced with :id) |
| `topApis[].count` | integer | Total request count in the last 5000 access log lines |
| `slowApis` | array | Slowest endpoints by avg latency, min 3 samples (present when type omitted or type=slow) |
| `slowApis[].method` | string | HTTP method |
| `slowApis[].path` | string | Normalized request path |
| `slowApis[].avgMs` | integer | Average response time in milliseconds |
| `slowApis[].sampleCount` | integer | Number of samples used for the average |

---

## `POST /api/uam/token`

**Backend target:** `http://uam-service.default.svc.cluster.local/realms/mockten-realm-dev/protocol/openid-connect/token`

Authenticates a user via Keycloak OpenID Connect (password grant). Kong injects `client_id`, `client_secret`, and `grant_type` automatically — callers only supply `username` and `password`. Returns an access token, refresh token, and ID token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `username` | body | string | Yes | User login name |
| `password` | body | string | Yes | User password |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `access_token` | string | JWT Bearer token for API authorization |
| `refresh_token` | string | Token used to obtain a new access token |
| `id_token` | string | OpenID Connect ID token |
| `token_type` | string | Token type, always "Bearer" |
| `expires_in` | integer | Access token lifetime in seconds |

---

## `GET /api/uam/userinfo`

**Backend target:** `http://uam-service.default.svc.cluster.local/realms/mockten-realm-dev/protocol/openid-connect/userinfo`

Returns the authenticated user's profile claims (sub, email, name, preferred_username) from Keycloak. Requires a valid Bearer token in the `Authorization` header. Kong proxies the token through to Keycloak's `/userinfo` endpoint.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `sub` | string | Unique user identifier (UUID) |
| `preferred_username` | string | Username of the authenticated user |
| `email` | string | User email address |
| `email_verified` | boolean | Whether the email has been verified |

---

## `GET /api/uam/auth`

**Backend target:** `http://uam-service.default.svc.cluster.local/realms/mockten-realm-dev/protocol/openid-connect/auth`

Redirects the browser to the Keycloak OAuth2 authorization page to begin an authorization-code flow. Kong appends `client_id=mockten-react-client` automatically. Used as the entry point for Google SSO login.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `response_type` | query | string | Yes | Must be "code" for authorization code flow |
| `redirect_uri` | query | string | Yes | Callback URL after login |
| `scope` | query | string | No | Requested scopes (space-separated) |
| `state` | query | string | No | Random string for CSRF protection |
| `nonce` | query | string | No | Nonce embedded in ID token |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `(302)` | Redirect | Redirects browser to Keycloak login page (HTML, not JSON) |
| `Location` | header | URL of the Keycloak login UI with session parameters |

---

## `GET /api/uam/users/:id`

**Backend target:** `http://uam-service.default.svc.cluster.local/admin/realms/mockten-realm-dev/users`

Fetches a single Keycloak user by UUID via the Admin REST API (the `userId` path segment is the Keycloak user id). Used by the Admin Portal's Edit User screen to prefill the form, including custom attributes such as `storeName`. Kong forwards the admin Bearer token and rewrites the URI to the Keycloak admin endpoint.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `userId` | path | string | Yes | Keycloak user UUID (auto-filled with a real dev_user_* id) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Keycloak user UUID |
| `username` | string | Login username |
| `email` | string | User email address |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `enabled` | boolean | Whether the account is enabled |
| `attributes` | object | Custom attributes (e.g. storeName, status) |

---

## `PUT /api/uam/users/:id`

**Backend target:** `http://uam-service.default.svc.cluster.local/admin/realms/mockten-realm-dev/users`

Updates a single Keycloak user by UUID via the Admin REST API. Used by the Admin Portal's Edit User screen to save changes to name, email, enabled state, and custom attributes (e.g. `storeName`). The `userId` path segment is the Keycloak user id. Requires an admin Bearer token forwarded by Kong.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `userId` | path | string | Yes | Keycloak user UUID (auto-filled with a real dev_user_* id) |
| `enabled` | body | boolean | No | Whether the account is enabled (partial update) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `(204)` | No Content | Keycloak returns 204 with an empty body on success |

---

## `DELETE /api/uam/users/:id`

**Backend target:** `http://uam-service.default.svc.cluster.local/admin/realms/mockten-realm-dev/users`

Deletes a user from the Keycloak realm by UUID via the Admin REST API. The `userId` path segment is the Keycloak user id. Requires an admin Bearer token (Kong forwards it and rewrites the URI to the Keycloak admin endpoint).

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `userId` | path | string | Yes | Keycloak user UUID to delete (auto-filled with a real dev_user_* id) |

**Response schema**

_Not documented._

---

## `GET /api/uam/groups`

**Backend target:** `http://uam-service.default.svc.cluster.local/admin/realms/mockten-realm-dev/groups`

Lists the Keycloak realm groups (`Customer`, `Seller`, `admin-group`). The same route prefix also serves group members at `/api/uam/groups/{groupId}/members`. The Admin Portal uses this to identify administrators by `admin-group` membership — there is no "admin" realm role, so admins cannot be told apart from the plain user list. Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].id` | string | Group UUID (use for /groups/{id}/members) |
| `[].name` | string | Group name (Customer / Seller / admin-group) |

---

## `GET /api/storage`

**Backend target:** `http://minio-service.default.svc.cluster.local:9000/photos`

Proxies GET requests to MinIO object storage (`/photos` bucket). The path segment after `/api/storage` maps directly to the photo filename in MinIO. Used by the frontend to render product images without exposing internal MinIO credentials.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `path` | path | string | Yes | Photo filename (appended to URL) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `(binary)` | image/* | Raw image binary (PNG/JPEG). Rendered directly in Response Log. |

---

## `GET /api/search`

**Backend target:** `http://searchitem-service.default.svc.cluster.local:50051/v1/search`

Full-text product search backed by MeiliSearch. The `searchitem` Go service builds a filtered MeiliSearch query supporting keyword, pagination, category, status (on_sale / sold_out), in-stock flag, price range, and minimum rating. Results include product metadata and photo URLs.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `q` | query | string | No | Search keyword |
| `p` | query | integer | No | Page number (1-based) |
| `status` | query | string | No | Item status filter (repeatable) |
| `category` | query | string | No | Category ID filter (repeatable) |
| `stock` | query | string | No | In-stock filter: "1" = in stock only |
| `min_price` | query | number | No | Minimum price filter |
| `max_price` | query | number | No | Maximum price filter |
| `min_rating` | query | number | No | Minimum average rating filter |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `items` | array | List of matching products |
| `items[].product_id` | string | Unique product identifier |
| `items[].product_name` | string | Display name of the product |
| `items[].seller_name` | string | Name of the seller |
| `items[].category` | integer | Category ID number |
| `items[].category_name` | string | Human-readable category name |
| `items[].price` | integer | Price in JPY |
| `items[].ranking` | integer | Popularity rank within category |
| `items[].stocks` | integer | Available stock quantity |
| `items[].main_url` | string | URL of the main product image |
| `items[].avg_review` | number | Average review rating (0–5) |
| `items[].review_count` | integer | Total number of reviews |
| `items[].condition` | string | "new" or "used" |
| `total` | integer | Estimated total number of matching products |
| `page` | integer | Current page number |

---

## `GET /api/categories`

**Backend target:** `http://searchitem-service.default.svc.cluster.local:50051/v1/categories`

Returns the complete list of product categories from MySQL via the `searchitem` service. Used by the frontend search bar to populate the category filter dropdown. No authentication required.

**Input schema**

_No parameters. (Authorization header attached automatically where required.)_

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].category_id` | string | Unique category identifier |
| `[].category_name` | string | Display name of the category |
| `[].category_image` | string | Image filename for the category |

---

## `GET /api/item/detail`

**Backend target:** `http://product-service.default.svc.cluster.local:50052/v1/item/detail`

Fetches full product detail (name, description, price, images, stock count, average rating) from MySQL. The `product` Go service looks up the row by `productId` path param and returns a JSON object including all fields.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `productId` | path | string | Yes | Product ID appended to URL path |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | string | Unique product identifier |
| `product_name` | string | Display name of the product |
| `price` | integer | Price in JPY |
| `category` | string | Category name |
| `category_id` | string | Category ID |
| `summary` | string | Product description |
| `regist_day` | string | Registration date (ISO 8601) |
| `last_update` | string | Last update date (ISO 8601) |
| `seller_name` | string | Name of the seller |
| `stocks` | integer | Available stock quantity |
| `avg_review` | number | Average review rating (0–5) |
| `review_count` | integer | Total number of reviews |

---

## `GET /api/item/reviews`

**Backend target:** `http://product-service.default.svc.cluster.local:50052/v1/item/reviews`

Returns paginated customer reviews for a specific product from MySQL. Supports `limit` / `offset` query params. The `product` Go service queries the Reviews table joined on `productId`.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `productId` | path | string | Yes | Product ID appended to URL path |
| `limit` | query | integer | No | Max reviews to return |
| `offset` | query | integer | No | Pagination offset |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].review_id` | string | Unique review identifier |
| `[].user_id` | string | ID of the reviewer |
| `[].rating` | integer | Rating from 1 to 5 |
| `[].comment` | string | Review text content |
| `[].created_at` | string | Review creation timestamp (ISO 8601) |

---

## `POST /api/item/review`

**Backend target:** `http://product-service.default.svc.cluster.local:50052/v1/item/review`

Submits or updates a product review. The `product` Go service upserts the review row and atomically recalculates the product's average rating using a weighted formula inside a MySQL transaction.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `productId` | body | string | Yes | ID of the product being reviewed |
| `rating` | body | integer | Yes | Rating from 1 to 5 |
| `comment` | body | string | No | Review comments text |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `productId` | string | Product ID that was reviewed |
| `reviewId` | string | Unique review identifier (UUID) |
| `userId` | string | User ID of the reviewer |
| `userName` | string | Username of the reviewer |
| `rating` | integer | Rating given (1–5) |
| `comment` | string | Review comment text |
| `createdAt` | string | Review creation timestamp (ISO 8601) |
| `avgReview` | number | Updated average rating for the product |
| `reviewCount` | integer | Updated total review count for the product |

---

## `POST /api/browsing-history/:id`

**Backend target:** `http://product-service.default.svc.cluster.local:50052`

Records a product page view in the `BrowsingHistory` MySQL table for the authenticated user. The `:productId` path segment identifies the viewed product. Called automatically by the frontend when a user visits a product detail page. Requires a valid Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `productId` | path | string | Yes | Product ID to record as viewed |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "recorded" on success |

---

## `GET /api/fav`

**Backend target:** `http://product-service.default.svc.cluster.local:50052`

Returns the authenticated user's wishlist from MySQL. The `product` Go service reads the `Wishlist` table, hydrates each stored product ID with full product data, and returns the list. Requires a valid JWT (user extracted from token claims).

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].product_id` | string | Product ID of the favorited item |
| `[].product_name` | string | Product display name |
| `[].price` | integer | Price in JPY |
| `[].main_url` | string | URL of the main product image |

---

## `GET /api/cart`

**Backend target:** `http://cart-service.default.svc.cluster.local:50053`

Retrieves the authenticated user's shopping cart from Redis. The `cart` Go service uses the user ID (from JWT) as the Redis key and returns a JSON array of cart items with quantity and product metadata.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `updated_at` | string | Last cart update timestamp (ISO 8601) |
| `items` | array | Cart line items |
| `items[].id` | string | Cart item identifier |
| `items[].product` | object | Product detail snapshot |
| `items[].product.product_id` | string | Product ID |
| `items[].product.product_name` | string | Product name |
| `items[].product.price` | integer | Unit price in JPY |
| `items[].quantity` | integer | Quantity in cart |
| `items[].added_at` | string | Timestamp when added (ISO 8601) |
| `items[].shipping_fee` | integer | Shipping cost in JPY |
| `items[].shipping_type` | string | "standard" or "express" |
| `items[].shipping_days` | integer | Estimated delivery days |

---

## `POST /api/profile`

**Backend target:** `http://geocoding-service.default.svc.cluster.local:8080/profile`

Saves or updates the user's delivery address. The `geocoding` Go service calls the Google Maps Geocoding API to convert the postal code and address into lat/lon coordinates, then persists the enriched profile.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `firstName` | body | string | Yes | First name of the user |
| `lastName` | body | string | Yes | Last name of the user |
| `postalCode` | body | string | Yes | Postal code for delivery address |
| `address` | body | string | Yes | Street address details |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `(200)` | No Content | Empty 200 OK on success — profile saved and geocoded |

---

## `GET /api/profile`

**Backend target:** `http://geocoding-service.default.svc.cluster.local:8080/profile`

Retrieves the authenticated user's delivery address profile from the `geocoding` Go service (stored in a local JSON file keyed by `user_id`). Returns name, postal code, address, and geocoded latitude/longitude.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `user_id` | query | string | Yes | User ID |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | User identifier |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `postal_code` | string | Postal code |
| `address` | string | Street address |

---

## `GET /api/shipping`

**Backend target:** `http://geocoding-service.default.svc.cluster.local:8080/shipping`

Calculates the shipping fee between the user's saved address (`geo_id`) and the product's warehouse location. The `geocoding` service computes the Haversine distance and applies a tiered fee schedule.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `user_id` | query | string | Yes | User ID |
| `geo_id` | query | string | No | Saved address geo ID |
| `product_id` | query | string | No | Product ID for weight/size |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `standard_fee` | integer | Standard shipping cost in JPY |
| `express_fee` | integer | Express shipping cost in JPY |
| `standard_days` | integer | Estimated days for standard delivery |
| `express_days` | integer | Estimated days for express delivery |

---

## `GET /api/geo`

**Backend target:** `http://geocoding-service.default.svc.cluster.local:8080/geo`

Returns saved geocoded address records for a user from the `geocoding` service. Used by the checkout flow to let the user select a previously saved delivery address.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `user_id` | query | string | Yes | User ID |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].geo_id` | string | Unique address record ID |
| `[].is_primary` | boolean | Whether this is the default address |
| `[].user_name` | string | Associated username |
| `[].country_code` | string | ISO 3166-1 country code |
| `[].postal_code` | string | Postal / zip code |
| `[].prefecture` | string | Prefecture / state |
| `[].city` | string | City name |
| `[].town` | string | Town / district |
| `[].building_name` | string | Building name (optional) |
| `[].room_number` | string | Room number (optional) |

---

## `PUT /api/geo`

**Backend target:** `http://geocoding-service.default.svc.cluster.local:8080/geo`

Saves a new geocoded address for the user. The `geocoding` Go service stores the address with lat/lon coordinates returned by Google Maps API.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `geo_id` | body | string | Yes | Saved address id to update (auto-filled with a real geo_id) |
| `user_id` | body | string | Yes | Owner of the address |
| `postal_code` | body | string | Yes | Postal code |
| `prefecture` | body | string | Yes | Prefecture / state |
| `city` | body | string | Yes | City |
| `town` | body | string | Yes | Town / street |
| `country_code` | body | string | No | ISO country code |

**Response schema**

_Not documented._

---

## `GET /api/payment-method`

**Backend target:** `http://ecpay-service.default.svc.cluster.local:8080`

Lists the authenticated user's saved payment methods (credit/debit cards) from MySQL via the `ecpay` Go service. Card details are stored encrypted; only type and masked number are returned.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].id` | string | Payment method identifier |
| `[].type` | string | Card type (e.g. VISA, JCB) |
| `[].details` | object | Card detail object (masked) |

---

## `POST /api/payment-method`

**Backend target:** `http://ecpay-service.default.svc.cluster.local:8080`

Attaches a Stripe **PaymentMethod** to the user and saves the reference in MySQL. The body takes a Stripe PaymentMethod id (`payment_method_id`) — the card itself is tokenized in the browser by Stripe.js, so raw card numbers never reach mockten. For testing, Stripe's ready-made ids work directly: `pm_card_visa` (VISA 4242 4242 4242 4242) and `pm_card_mastercard` (5555 5555 5555 4444).

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `payment_method_id` | body | string | Yes | Stripe PaymentMethod id to attach. Use Stripe's test id pm_card_visa (VISA 4242…); pm_card_mastercard also works. |

**Response schema**

_Not documented._

---

## `PUT /api/payment-method`

**Backend target:** `http://ecpay-service.default.svc.cluster.local:8080`

Marks a saved payment method as the user's **default** card (all others are unset). Served by the `ecpay` handler at `/api/payment-method/default`; Kong prefix-matches `/api/payment-method`. Body: `payment_method_id`.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `payment_method_id` | body | string | Yes | Saved payment-method id to make the default (auto-filled with a real saved card) |

**Response schema**

_Not documented._

---

## `DELETE /api/payment-method`

**Backend target:** `http://ecpay-service.default.svc.cluster.local:8080`

Removes a saved payment method from MySQL and detaches the Stripe payment method via the Stripe API.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `payment_method_id` | body | string | Yes | Saved payment-method id to delete (auto-filled with a real saved card) |

**Response schema**

_Not documented._

---

## `GET /api/ranking`

**Backend target:** `http://ranking-service.default.svc.cluster.local:8080`

Returns top-ranked products ordered by total purchase count. The `ranking` Go service reads a sorted set from Redis that is updated in real-time on each purchase event. Supports optional category filter.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `category` | query | string | No | Filter by category slug (optional) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `ranking_month` | string | Month the ranking was computed (YYYY-MM) |
| `category` | string | Category slug, empty = all categories |
| `ranking` | array | Ranked product list |
| `ranking[].product_id` | string | Product identifier |
| `ranking[].score` | number | Ranking score |
| `ranking[].product_name` | string | Product display name |
| `ranking[].image` | string | Product image URL |
| `ranking[].summary` | string | Short product description |
| `ranking[].price` | integer | Price in JPY |
| `ranking[].rating` | number | Average review rating (0–5) |

---

## `POST /api/ranking`

**Backend target:** `http://ranking-service.default.svc.cluster.local:8080`

Increments a product's score in the current month's Redis ranking sorted sets (both the per-category set and the cross-category "all" set) by `quantity`. Called on each purchase to keep best-seller rankings live. The backend handler lives at `/api/ranking/update` (Kong prefix-matches `/api/ranking`). No authentication required.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `product_id` | body | string | Yes | Product whose ranking score to increment |
| `category_id` | body | integer | Yes | Numeric category id of the product |
| `quantity` | body | integer | Yes | Amount to add to the score (units bought) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Confirmation that the ranking score was updated |

---

## `GET /api/shipment`

**Backend target:** `http://shipment-service.default.svc.cluster.local:8080/v1/shipment`

Returns shipment records for the given user from MySQL. Each record includes order ID, recipient, address, current status (preparing / in_transit / delivered), and estimated delivery date simulated by the `shipment` Go service.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `userId` | query | string | Yes | User ID to fetch shipments for |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].transaction_id` | string | Shipment transaction identifier |
| `[].product_id` | string | Shipped product identifier |
| `[].product_name` | string | Product display name |
| `[].status` | string | Shipment status (e.g. shipped, delivered) |
| `[].purchase_date` | string | Purchase timestamp (ISO 8601) |

---

## `POST /api/shipment`

**Backend target:** `http://shipment-service.default.svc.cluster.local:8080/v1/shipment`

Creates a new shipment record in MySQL and starts the delivery state machine. The `shipment` Go service advances status from "preparing" → "in_transit" → "delivered" on a configurable tick interval.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `product_id` | body | string | Yes | Product being shipped (auto-filled with a real product) |
| `geo_id` | body | string | Yes | Destination address id (auto-filled with a real geo_id) |
| `quantity` | body | integer | Yes | Units to ship |
| `scheduled_start` | body | string | No | Optional delivery start "YYYY-MM-DD HH:MM:SS". Omitted in TEST_MODE, where delivery advances immediately. |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | string | Created shipment transaction identifier |
| `status` | string | Initial shipment status |

---

## `GET /api/sale`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080`

Returns currently active sale items from the `sale` Go service. Items are indexed in MeiliSearch with discount metadata; this endpoint queries MeiliSearch and returns the filtered, sorted list of discounted products.

**Input schema**

_No parameters. (Authorization header attached automatically where required.)_

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].id` | string | Sale campaign identifier |
| `[].name` | string | Campaign display name |
| `[].start_date` | string | Campaign start date (ISO 8601) |
| `[].end_date` | string | Campaign end date (ISO 8601) |
| `[].discount_rate` | number | Discount percentage (0–100) |

---

## `GET /api/seller/stats`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/stats`

Returns aggregated sales statistics for the authenticated seller. Compares the last 30 days (current window) against the preceding 31–60 days (previous window) and includes percentage change for each metric. All four metrics — revenue, orders, products sold, and unique customers — are derived from the `Order` and `Transaction` MySQL tables joined on the seller's products. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `current.revenue` | number | Total revenue in JPY for the last 30 days |
| `current.orders` | integer | Number of distinct orders in the last 30 days |
| `current.products` | integer | Number of distinct products sold in the last 30 days |
| `current.customers` | integer | Number of distinct customers in the last 30 days |
| `previous.revenue` | number | Revenue for the 31–60 day window before today |
| `previous.orders` | integer | Orders for the 31–60 day window |
| `previous.products` | integer | Distinct products sold in the 31–60 day window |
| `previous.customers` | integer | Distinct customers in the 31–60 day window |
| `change.revenue` | number|null | Revenue % change vs previous period (null if prev=0) |
| `change.orders` | number|null | Orders % change vs previous period |
| `change.products` | number|null | Products sold % change vs previous period |
| `change.customers` | number|null | Customers % change vs previous period |

---

## `GET /api/seller/orders`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/orders`

Returns a paginated list of orders that contain at least one product owned by the authenticated seller. Supports filtering by status group: Pending (created/paid), Processing (picking/shipped), Completed (delivered), or Canceled. Ordered by creation date descending. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `page` | query | integer | No | Page number (1-based) |
| `limit` | query | integer | No | Items per page |
| `status` | query | string | No | Status group: Pending / Processing / Completed / Canceled / (all) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `orders` | array | List of orders for this seller |
| `orders[].order_id` | string | Unique order UUID |
| `orders[].user_id` | string | Email/ID of the buyer |
| `orders[].amount` | number | Total order amount in JPY |
| `orders[].status` | string | Order status (created / paid / picking / shipped / delivered / canceled / refunded) |
| `orders[].created_at` | string | Order creation timestamp (YYYY-MM-DD HH:mm:ss) |
| `total` | integer | Total number of matching orders |
| `page` | integer | Current page number |
| `limit` | integer | Page size used |

---

## `GET /api/admin/orders`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/orders`

Returns the paginated list of *flagged* orders for the Admin Portal's Order Monitoring view. The `sale` Go service scans recent orders and flags each one with a derived reason: `Failed / canceled` (status canceled/refunded/failed), `Unusual location` (shipping destination in an EU country, resolved via the `Geo` table), `Multiple rapid orders` (≥3 orders by the same user within 15 minutes), or `High value` (amount ≥ $200). Only flagged orders are returned. Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `page` | query | integer | No | Page number (1-based) |
| `limit` | query | integer | No | Flagged orders per page (max 100) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `orders` | array | Flagged orders for the current page |
| `orders[].order_id` | string | Order UUID |
| `orders[].user_id` | string | Buyer identifier (email) |
| `orders[].amount` | number | Order total amount |
| `orders[].status` | string | Order status (paid / canceled / …) |
| `orders[].country` | string | Shipping destination country code (if any) |
| `orders[].reason` | string | Why the order was flagged |
| `orders[].flagged` | boolean | Always true in this list |
| `orders[].created_at` | string | Order creation timestamp |
| `total` | integer | Total number of flagged orders |
| `page` | integer | Current page number |
| `limit` | integer | Page size |

---

## `GET /api/admin/audit`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/audit`

Returns the paginated platform audit trail (most recent first) for the Admin Portal's Activity Logs view. Each entry records an action, the actor (email from the JWT), an optional target, a status (success/failure/warning), and a timestamp, read from the `AuditLog` MySQL table. Supports `page` / `limit` query params. Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `page` | query | integer | No | Page number (1-based) |
| `limit` | query | integer | No | Audit entries per page |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `logs` | array | Audit entries, newest first |
| `logs[].id` | integer | Audit row id |
| `logs[].action` | string | Recorded action name |
| `logs[].actor` | string | Who performed the action (email) |
| `logs[].target` | string | Target the action applied to |
| `logs[].status` | string | success / failure / warning |
| `logs[].created_at` | string | When the event occurred |
| `total` | integer | Total audit entries |
| `page` | integer | Current page number |
| `limit` | integer | Page size |

---

## `POST /api/admin/audit`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/audit`

Appends an entry to the platform audit trail (`AuditLog` table). The actor is taken from the caller's JWT; the body supplies the `action` (required), an optional `target`, and an optional `status` (defaults to `success`). Used across the platform to record security-relevant events such as logins, order placement, and admin operations. Requires any valid Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `action` | body | string | Yes | Action name to record (required) |
| `target` | body | string | No | Optional target the action applies to |
| `status` | body | string | No | Outcome: success / failure / warning (defaults to success) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true when the audit entry was recorded |

---

## `GET /api/admin/health`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/health`

Returns live system-health for the Admin Portal's System Health / System Alerts panels. The `sale` Go service derives each component's status from real signals — database reachability and table row counts (e.g. the Catalog/Inventory component reflects the out-of-stock ratio) — and emits colloquial alerts when a component is degraded, plus summary metrics. Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `components` | array | Per-component health |
| `components[].name` | string | Component name (Database / API Server / Catalog-Inventory) |
| `components[].status` | string | healthy / degraded / down |
| `components[].detail` | string | Human-readable detail for the component |
| `alerts` | array | Colloquial alert messages for degraded components |
| `metrics` | object | Summary metrics (counts / ratios) |

---

## `GET /api/admin/seller`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/seller`

Returns a seller's store profile (store name + description) by `email`, read from the same `Seller` table the storefront and Seller Portal use. Lets the Admin Portal show the real buyer-facing store name instead of only the Keycloak attribute (which is empty for pre-seeded sellers). Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `email` | query | string | Yes | Seller's email (= their Seller table id) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `email` | string | The seller's email (echoed back) |
| `seller_name` | string | Buyer-facing store name |
| `description` | string | About-the-vendor description |

---

## `PUT /api/admin/seller`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/admin/seller`

Updates a seller's buyer-facing store name in the `Seller` table, so an admin edit actually changes what buyers see on the storefront (not just the Keycloak attribute). Body: `email` + `seller_name`. Requires an admin Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <access_token> |
| `email` | body | string | Yes | Seller's email (= their Seller table id) |
| `seller_name` | body | string | Yes | New buyer-facing store name |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true when the store name was saved |

---

## `GET /api/seller/categories`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/categories`

Returns the complete list of product categories from MySQL, ordered by name. Used by the seller portal to populate the category dropdown when creating or editing products. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].category_id` | string | Unique category identifier |
| `[].category_name` | string | Display name of the category |

---

## `POST /api/seller/products/create`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/products/create`

Creates a new product for the authenticated seller. Inserts a row into the `Product` table and an initial stock row into `Stock`. If `comparePrice` is set higher than `price`, the product is automatically linked to the default sale campaign. Returns the generated product UUID. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `name` | body | string | Yes | Product name |
| `description` | body | string | No | Product description |
| `price` | body | number | Yes | Selling price in JPY |
| `comparePrice` | body | number | No | Original price (> price triggers sale flag) |
| `category_id` | body | string | Yes | Category ID from /api/seller/categories |
| `product_condition` | body | string | No | "new" or "used" (defaults to "new") |
| `stock` | body | integer | Yes | Initial stock quantity |
| `status` | body | boolean | No | Active status (true = active) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | string | UUID of the newly created product |

---

## `PUT /api/seller/products/:id/status`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/products`

Toggles the active/inactive flag of a product owned by the authenticated seller. Send `is_active: 1` to activate or `is_active: 0` to deactivate. The product will show an "inactive" badge in the seller portal and will not appear as purchasable to buyers. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `id` | path | string | Yes | Product ID to toggle |
| `is_active` | body | integer | Yes | 1 = activate, 0 = deactivate |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true on success |

---

## `DELETE /api/seller/products/:id/images/:id`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/products`

Deletes a single product image slot from MinIO object storage. The `slot` path segment selects which object to remove: 0 → `{productId}.png`, 1 → `{productId}/1.png`, 2 → `{productId}/2.png`. Used by the Seller Portal edit modal's per-slot Delete control. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `id` | path | string | Yes | Product ID whose image slot is removed |
| `slot` | path | integer | Yes | Image slot: 0={id}.png, 1={id}/1.png, 2={id}/2.png |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true on success |

---

## `POST /api/seller/products/:id/images`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080/v1/seller/products`

Uploads up to 3 product images to MinIO object storage (bucket: `photos`). Images are stored as `{productId}.png`, `{productId}/1.png`, and `{productId}/2.png`. The request must be multipart/form-data with the field name `images[]`. An optional `?slot=N` (0–2) query uploads a single slot. Returns a list of the stored MinIO object paths. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `id` | path | string | Yes | Product ID to attach the image to |
| `slot` | query | integer | No | Optional single slot 0-2 (omit to fill in order) |
| `images[]` | file | file | Yes | Product image file (a 1×1 test PNG is generated automatically) |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true when the image(s) were stored in MinIO |

---

## `GET /api/seller/products`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080`

Returns a paginated list of the authenticated seller's products with stock levels and computed status labels: active, low stock (< 10 units), out of stock (0 units), or inactive (manually deactivated). Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `page` | query | integer | No | Page number (1-based) |
| `limit` | query | integer | No | Number of items per page |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `products` | array | List of products for this seller |
| `products[].product_id` | string | Unique product identifier |
| `products[].product_name` | string | Product display name |
| `products[].price` | integer | Price in JPY |
| `products[].condition` | string | "new" or "used" |
| `products[].stocks` | integer | Current stock quantity |
| `products[].status` | string | Computed status: active / low stock / out of stock / inactive |
| `products[].is_active` | integer | 1 = active, 0 = manually deactivated |
| `total` | integer | Total number of seller's products |
| `page` | integer | Current page number |
| `limit` | integer | Page size used |

---

## `GET /api/seller/profile`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080`

Returns the store name (seller_name) and About-the-Vendor description for the authenticated seller, looked up from the `Seller` table by the seller email extracted from the JWT. Falls back to the sign-up storeName attribute when no profile has been saved yet. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `seller_id` | string | Seller email (extracted from JWT) |
| `seller_name` | string | Store display name (falls back to sign-up storeName) |
| `description` | string | About-the-Vendor text (empty if not set) |

---

## `PUT /api/seller/profile`

**Backend target:** `http://sale-service.default.svc.cluster.local:8080`

Creates or updates the store name for the authenticated seller using an upsert (`INSERT … ON DUPLICATE KEY UPDATE`) on the `Seller` table. Requires a valid seller Bearer token.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `Authorization` | header | string | Yes | Bearer <seller_access_token> — auto-filled with healthcompany test account |
| `seller_name` | body | string | Yes | Store display name |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | true on success |

---

## `GET /api/recommendation`

**Backend target:** `http://recommendation-service.default.svc.cluster.local:8080`

Returns personalized product recommendations for a user. The Python `recommendation` service uses a collaborative-filtering model (trained on purchase history) to score items. Falls back to popularity-based ranking for cold-start users.

**Input schema**

| Parameter | Location | Type | Mandatory | Description |
|-----------|----------|------|-----------|-------------|
| `user_id` | query | string | Yes | User email or ID for personalized recommendations |

**Response schema**

| Field | Type | Description |
|-------|------|-------------|
| `[].product_id` | string | Recommended product identifier |
| `[].product_name` | string | Product display name |
| `[].category_id` | string | Category identifier |
| `[].price` | number | Price in JPY |
| `[].score` | number | Recommendation confidence score |
| `[].image_url` | string | Product image URL |

---

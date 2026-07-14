# Data Architecture

> Auto-generated from the live `mocktendb` schema and the Meilisearch `products` index. Regenerate with the snippet in the repo (see below). Keycloak's own internal tables (`CLIENT`, `CREDENTIAL`, `USER_ENTITY`, …) live in the same database but are managed by Keycloak and are intentionally omitted here.

## Overview

- **MySQL (`mocktendb`)** is the source of truth for the storefront domain: catalog, inventory, sellers, orders, payments, shipping, geo, and the admin audit log.
- **Meilisearch (`products` index)** is a search projection of the catalog, kept in step by the `sync` job (incremental) and `meilisearch/load_mysql.sh` (initial load). It is **not** authoritative.
- **Redis** holds shopping carts and the real-time best-seller ranking sorted sets (not shown as tables).
- **MinIO** stores product images and ML model artifacts (object storage, not tables).
## MySQL application tables

### `Category`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `category_id` | varchar(3) | no | PK |
| `category_name` | varchar(255) | yes |  |
| `category_image` | varchar(255) | yes |  |
| `last_update` | datetime | yes |  |

### `Product`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `product_id` | varchar(36) | no | PK |
| `product_name` | varchar(255) | yes |  |
| `seller_id` | varchar(64) | yes |  |
| `price` | int | yes |  |
| `category_id` | varchar(3) | yes | FK/idx |
| `summary` | text | yes |  |
| `product_condition` | enum('new','used') | no |  |
| `geo_id` | varchar(64) | yes | FK/idx |
| `avg_review` | decimal(3,1) | no |  |
| `review_count` | int | no |  |
| `regist_day` | datetime | yes |  |
| `last_update` | datetime | yes | FK/idx |
| `sale_flag` | tinyint(1) | no |  |
| `sale_id` | varchar(36) | yes |  |
| `is_active` | tinyint(1) | no |  |

### `Stock`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `product_id` | varchar(36) | no | PK |
| `stocks` | int | yes |  |
| `last_update` | datetime | yes | FK/idx |

### `Seller`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `seller_id` | varchar(64) | no | PK |
| `seller_name` | varchar(255) | yes |  |
| `description` | text | yes |  |
| `last_update` | datetime | yes |  |

### `TimeSale`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | varchar(36) | no | PK |
| `name` | varchar(255) | no |  |
| `start_date` | datetime | no |  |
| `end_date` | datetime | no |  |
| `discount_rate` | decimal(3,2) | no |  |

### `Review`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `review_id` | varchar(36) | no | PK |
| `product_id` | varchar(36) | no | FK/idx |
| `user_id` | varchar(255) | no |  |
| `rating` | tinyint | no |  |
| `comment` | text | yes |  |
| `status` | enum('active','deleted','hidden') | no |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

### `Wishlist`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `user_id` | varchar(36) | no | PK |
| `product_ids` | json | no |  |
| `updated` | datetime | yes |  |

### `BrowsingHistory`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | bigint | no | PK |
| `user_id` | varchar(255) | no | FK/idx |
| `product_id` | varchar(36) | no | FK/idx |
| `viewed_at` | datetime | yes |  |

### `Geo`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `geo_id` | varchar(36) | no | PK |
| `user_id` | varchar(255) | no | FK/idx |
| `country_code` | varchar(2) | yes |  |
| `postal_code` | varchar(36) | yes |  |
| `prefecture` | varchar(50) | yes |  |
| `city` | varchar(100) | yes |  |
| `town` | varchar(100) | yes |  |
| `building_name` | varchar(100) | yes |  |
| `room_number` | varchar(20) | yes |  |
| `latitude` | decimal(10,7) | yes |  |
| `longitude` | decimal(10,7) | yes |  |
| `is_primary` | tinyint(1) | no |  |

### `ShippingRate`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `country_code` | char(2) | no | PK |
| `shipping_type` | enum('standard','express') | no | PK |
| `rate_per_10km` | float | no |  |

### `AirCost`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `origin` | varchar(10) | no | PK |
| `destination` | varchar(10) | no | PK |
| `cost_usd` | decimal(10,2) | yes |  |

### `DomesticAirCost`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `origin` | varchar(10) | no | PK |
| `destination` | varchar(10) | no | PK |
| `cost_usd` | decimal(10,2) | yes |  |

### `SeaCost`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `origin_country_code` | varchar(10) | no | PK |
| `destination_country_code` | varchar(10) | no | PK |
| `cost_usd` | decimal(10,2) | yes |  |

### `Order`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `order_id` | varchar(36) | no | PK |
| `user_id` | varchar(255) | no |  |
| `currency` | char(3) | no |  |
| `subtotal_amount` | decimal(12,2) | no |  |
| `shipping_amount` | decimal(12,2) | no |  |
| `total_amount` | decimal(12,2) | no |  |
| `quantity` | int | yes |  |
| `status` | enum('created','paid','picking','shipped','delivered','canceled','refunded') | no | FK/idx |
| `transactions_json` | json | no |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

### `Transaction`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `transaction_id` | varchar(36) | no | PK |
| `product_id` | varchar(36) | no | FK/idx |
| `geo_id` | varchar(36) | no | FK/idx |
| `status` | enum('quoted','booked','picked_up','in_transit','delayed','delivered','canceled','failed') | no |  |
| `leg_type` | enum('road','air','sea') | no | FK/idx |
| `scheduled_start` | datetime | yes |  |
| `quantity` | int | no |  |
| `created_at` | datetime | yes | FK/idx |
| `updated_at` | datetime | yes |  |

### `Payment`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `payment_id` | varchar(36) | no | PK |
| `order_id_list` | json | no |  |
| `payment_method_id` | varchar(36) | yes |  |
| `amount` | decimal(12,2) | no |  |
| `currency` | char(3) | no |  |
| `status` | enum('authorized','captured','failed','canceled','refunded') | no |  |
| `idempotency_key` | varchar(64) | yes | unique |
| `stripe_payment_intent_id` | varchar(64) | yes |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

### `PaymentMethod`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `payment_method_id` | varchar(36) | no | PK |
| `user_id` | varchar(255) | no | FK/idx |
| `stripe_customer_id` | varchar(64) | no |  |
| `stripe_payment_method_id` | varchar(64) | no |  |
| `brand` | varchar(20) | no |  |
| `last4` | char(4) | no |  |
| `exp_month` | tinyint | no |  |
| `exp_year` | smallint | no |  |
| `is_default` | tinyint(1) | no |  |
| `status` | enum('active','inactive') | no |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

### `PaymentProfile`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `user_id` | varchar(255) | no | PK |
| `stripe_customer_id` | varchar(64) | no |  |
| `created_at` | datetime | yes |  |
| `updated_at` | datetime | yes |  |

### `AuditLog`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | bigint | no | PK |
| `action` | varchar(128) | no |  |
| `actor` | varchar(255) | no |  |
| `actor_type` | varchar(16) | no | FK/idx |
| `target` | varchar(255) | yes |  |
| `status` | enum('success','failed','warning') | no |  |
| `created_at` | datetime | yes | FK/idx |

### `DashboardMetrics`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `id` | int | no | PK |
| `ts` | varchar(8) | no |  |
| `cpu` | decimal(6,2) | no |  |
| `mem` | decimal(6,2) | no |  |
| `mem_mb` | decimal(8,1) | no |  |
| `mysql_conn` | int | no |  |
| `redis_conn` | int | no |  |
| `kong_total` | bigint | no |  |
| `created_at` | datetime | yes | FK/idx |

### `ApiSLA`

| Column | Type | Null | Key |
|--------|------|------|-----|
| `method` | varchar(10) | no | PK |
| `path` | varchar(255) | no | PK |
| `sla_ms` | int | no |  |
| `description` | varchar(255) | yes |  |

## Meilisearch — `products` index

A denormalized projection of `Product` joined with `Seller`, `Category` and `Stock`, refreshed by the `sync` job. Configured attributes (live):

| Role | Attributes |
|------|------------|
| **Searchable** | `product_name`, `seller_name`, `category_name` |
| **Filterable** | `seller_name`, `category_name`, `condition`, `stocks`, `price`, `avg_review`, `review_count`, `sale_flag`, `sale_id` |
| **Sortable** | (none configured) |

Deactivated products are removed from the index by `sync` so they stop appearing in storefront search while remaining in MySQL.

## Regenerating this page

This page was produced from the running stack. To refresh it, dump the schema for the app tables:
```sh
docker exec mysql-service.default.svc.cluster.local mysql --ssl-mode=DISABLED \
  -umocktenusr -pmocktenpassword -D mocktendb -e "SHOW TABLES"
# and the Meilisearch index settings:
curl -s http://localhost:7700/indexes/products/settings | jq
```

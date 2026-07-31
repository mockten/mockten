#!/bin/bash
set -e

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenro"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

KEYCLOAK_URL="http://uam-service.default.svc.cluster.local/realms/mockten-realm-dev"
MEILI_URL="http://meilisearch-service.default.svc.cluster.local:7700"

until mysqladmin --skip-ssl ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" --silent 2>/dev/null; do
  echo "Waiting for MySQL to be available..."
  sleep 1
done

until curl -sf "$KEYCLOAK_URL" > /dev/null; do
  echo "Waiting for Keycloak to be ready..."
  sleep 2
done

until curl -sf "$MEILI_URL/health" > /dev/null; do
  echo "Waiting for MeiliSearch to be ready..."
  sleep 1
done

# Configure the index settings FIRST, before loading any document. These used to
# run after the document POST, so under `set -e` a single bad document aborted the
# script before filterable-attributes was ever set — leaving the left-nav facets
# (category / price / sale) dead even after products appeared. Settings are
# independent of the data, so they must not depend on the load succeeding.
curl -sf -X PUT "$MEILI_URL/indexes/products/settings/searchable-attributes" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "product_name",
    "seller_name",
    "category_name"
  ]' > /dev/null

curl -sf -X PUT "$MEILI_URL/indexes/products/settings/filterable-attributes" \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "seller_name",
    "category_name",
    "condition",
    "stocks",
    "price",
    "avg_review",
    "review_count",
    "sale_flag",
    "sale_id"
  ]' > /dev/null

# Build the document array in SQL with JSON_ARRAYAGG/JSON_OBJECT instead of hand-
# rolling JSON from tab-separated --raw output. The old shell parser used
# `while IFS=$'\t' read`, and TAB is an IFS whitespace char, so a run of tabs
# (an empty field such as a missing seller_name) collapsed and every later field
# shifted left — producing invalid JSON like `"price":Health`. MeiliSearch then
# 400'd the whole batch. Letting MySQL emit the JSON makes empty fields harmless
# and quotes/escapes correct by construction. COALESCE(...) around the empty array
# so a zero-row catalog yields `[]`, not the literal NULL.
mysql --skip-ssl -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --skip-column-names -e "
SELECT COALESCE(
  JSON_ARRAYAGG(
    JSON_OBJECT(
      'product_id',    p.product_id,
      'product_name',  p.product_name,
      'seller_name',   COALESCE(ue.USERNAME, ''),
      'price',         p.price,
      'category_name', COALESCE(c.category_name, ''),
      'condition',     p.product_condition,
      'stocks',        COALESCE(t.stocks, 0),
      'avg_review',    p.avg_review,
      'review_count',  p.review_count,
      'sale_flag',     CAST(IF(p.sale_flag = 1, 'true', 'false') AS JSON),
      'sale_id',       COALESCE(p.sale_id, ''),
      'discount_rate', COALESCE(ts.discount_rate, 0.0)
    )
  ),
  JSON_ARRAY()
)
FROM Product p
-- LEFT joins so a product is never dropped for a missing lookup row. This used to
-- INNER JOIN the seller's Keycloak user/group and filter WHERE kg.NAME='Seller',
-- which on a fresh cloud realm indexed only the ~58 products whose seller was a
-- Seller-group member — the rest of the catalog was invisible to search/browse.
LEFT JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
LEFT JOIN Category c ON p.category_id = c.category_id
LEFT JOIN Stock t ON p.product_id = t.product_id
LEFT JOIN TimeSale ts ON p.sale_id = ts.id
WHERE p.is_active = 1
" > /tmp/products.json

curl -sf -X POST "$MEILI_URL/indexes/products/documents?primaryKey=product_id" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/products.json > /dev/null

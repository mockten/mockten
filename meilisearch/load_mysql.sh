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

mysql --skip-ssl -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --silent -e "
SELECT
  p.product_id,
  p.product_name,
  COALESCE(ue.USERNAME, '') AS seller_name,
  p.price,
  COALESCE(c.category_name, '') AS category_name,
  p.product_condition,
  COALESCE(t.stocks, 0) AS stocks,
  p.avg_review,
  p.review_count,
  p.sale_flag,
  COALESCE(p.sale_id, '') AS sale_id,
  COALESCE(ts.discount_rate, 0.0) AS discount_rate
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
" > /tmp/products.tsv

total_lines=$(wc -l < /tmp/products.tsv | tr -d ' ')
current_line=0

{
  echo "["
  while IFS=$'\t' read -r id name seller price category condition stocks avg_review review_count sale_flag sale_id discount_rate
  do
    current_line=$((current_line + 1))
    id_clean=$(echo "$id" | tr -d '\000-\037' | sed 's/"/\\"/g')
    name_clean=$(echo "$name" | tr -d '\000-\037' | sed 's/"/\\"/g')
    seller_clean=$(echo "$seller" | tr -d '\000-\037' | sed 's/"/\\"/g')
    category_clean=$(echo "$category" | tr -d '\000-\037' | sed 's/"/\\"/g')
    condition_clean=$(echo "$condition" | tr -d '\000-\037' | sed 's/"/\\"/g')
    sale_id_clean=$(echo "$sale_id" | tr -d '\000-\037' | sed 's/"/\\"/g')

    price_num=${price:-0}
    stocks_num=${stocks:-0}
    avg_review_num=${avg_review:-0}
    review_count_num=${review_count:-0}
    sale_flag_bool=$( [ "$sale_flag" = "1" ] && echo "true" || echo "false" )
    discount_rate_num=${discount_rate:-0.0}

    if [ "$current_line" -eq "$total_lines" ]; then
      echo "  {\"product_id\":\"$id_clean\",\"product_name\":\"$name_clean\",\"seller_name\":\"$seller_clean\",\"price\":$price_num,\"category_name\":\"$category_clean\",\"condition\":\"$condition_clean\",\"stocks\":$stocks_num,\"avg_review\":$avg_review_num,\"review_count\":$review_count_num,\"sale_flag\":$sale_flag_bool,\"sale_id\":\"$sale_id_clean\",\"discount_rate\":$discount_rate_num}"
    else
      echo "  {\"product_id\":\"$id_clean\",\"product_name\":\"$name_clean\",\"seller_name\":\"$seller_clean\",\"price\":$price_num,\"category_name\":\"$category_clean\",\"condition\":\"$condition_clean\",\"stocks\":$stocks_num,\"avg_review\":$avg_review_num,\"review_count\":$review_count_num,\"sale_flag\":$sale_flag_bool,\"sale_id\":\"$sale_id_clean\",\"discount_rate\":$discount_rate_num},"
    fi
  done < /tmp/products.tsv
  echo "]"
} > /tmp/products.json

curl -sf -X POST "$MEILI_URL/indexes/products/documents?primaryKey=product_id" \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/products.json > /dev/null

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

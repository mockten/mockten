#!/bin/bash
set -e

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenusr"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

KEYCLOAK_URL="http://uam-service.default.svc.cluster.local/realms/mockten-realm-dev"
MEILI_URL="http://meilisearch-service.default.svc.cluster.local:7700"

until mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" --silent; do
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

mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --silent -e "
SELECT
  p.product_id,
  p.product_name,
  ue.USERNAME AS seller_name,
  p.price,
  c.category_name,
  p.product_condition,
  t.stocks,
  p.avg_review,
  p.review_count
FROM Product p
JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
JOIN USER_GROUP_MEMBERSHIP ugm ON ue.ID = ugm.USER_ID
JOIN KEYCLOAK_GROUP kg ON ugm.GROUP_ID = kg.ID
JOIN Category c ON p.category_id = c.category_id
JOIN Stock t ON p.product_id = t.product_id
WHERE kg.NAME = 'Seller'
" > /tmp/products.tsv

total_lines=$(wc -l < /tmp/products.tsv | tr -d ' ')
current_line=0

{
  echo "["
  while IFS=$'\t' read -r id name seller price category condition stocks avg_review review_count
  do
    current_line=$((current_line + 1))
    id_clean=$(echo "$id" | tr -d '\000-\037' | sed 's/"/\\"/g')
    name_clean=$(echo "$name" | tr -d '\000-\037' | sed 's/"/\\"/g')
    seller_clean=$(echo "$seller" | tr -d '\000-\037' | sed 's/"/\\"/g')
    category_clean=$(echo "$category" | tr -d '\000-\037' | sed 's/"/\\"/g')
    condition_clean=$(echo "$condition" | tr -d '\000-\037' | sed 's/"/\\"/g')

    price_num=${price:-0}
    stocks_num=${stocks:-0}
    avg_review_num=${avg_review:-0}
    review_count_num=${review_count:-0}

    if [ "$current_line" -eq "$total_lines" ]; then
      echo "  {\"product_id\":\"$id_clean\",\"product_name\":\"$name_clean\",\"seller_name\":\"$seller_clean\",\"price\":$price_num,\"category_name\":\"$category_clean\",\"condition\":\"$condition_clean\",\"stocks\":$stocks_num,\"avg_review\":$avg_review_num,\"review_count\":$review_count_num}"
    else
      echo "  {\"product_id\":\"$id_clean\",\"product_name\":\"$name_clean\",\"seller_name\":\"$seller_clean\",\"price\":$price_num,\"category_name\":\"$category_clean\",\"condition\":\"$condition_clean\",\"stocks\":$stocks_num,\"avg_review\":$avg_review_num,\"review_count\":$review_count_num},"
    fi
  done < /tmp/products.tsv
  echo "]"
} > /tmp/products.json

curl -sf -X POST "$MEILI_URL/indexes/products/documents" \
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
    "review_count"
  ]' > /dev/null

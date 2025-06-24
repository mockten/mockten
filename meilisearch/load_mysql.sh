#!/bin/bash

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenusr"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

# Wait for MySQL to be available
until mysqladmin ping -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" --silent; do
  echo "Waiting for MySQL to be available..."
  sleep 1
done

# Wait for Keycloak readiness
until curl -sf http://uam-service.default.svc.cluster.local:8080/realms/mockten-realm-dev; do
  echo "Waiting for Keycloak to be ready..."
  sleep 2
done

# Fetch product data from MySQL
mysql -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --silent -e "
SELECT
  p.product_id,
  p.product_name,
  ue.USERNAME AS seller_name,
  p.price,
  c.category_name,
  p.product_condition
FROM Product p
JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
JOIN USER_GROUP_MEMBERSHIP ugm ON ue.ID = ugm.USER_ID
JOIN KEYCLOAK_GROUP kg ON ugm.GROUP_ID = kg.ID
JOIN Category c ON p.category_id = c.category_id
WHERE kg.NAME = 'Seller'
" > /tmp/products.csv

# Count total lines
total_lines=$(wc -l < /tmp/products.csv)
current_line=0

# Convert CSV to JSON array
{
  echo "["
  while IFS=$'\t' read -r id name seller price category condition
  do
    current_line=$((current_line + 1))
    id_clean=$(echo "$id" | tr -d '\000-\037' | sed 's/"/\\"/g')
    name_clean=$(echo "$name" | tr -d '\000-\037' | sed 's/"/\\"/g')
    seller_clean=$(echo "$seller" | tr -d '\000-\037' | sed 's/"/\\"/g')
    category_clean=$(echo "$category" | tr -d '\000-\037' | sed 's/"/\\"/g')
    condition_clean=$(echo "$condition" | tr -d '\000-\037' | sed 's/"/\\"/g')

    if [ "$current_line" -eq "$total_lines" ]; then
      echo "  {\"product_id\":\"$id_clean\", \"product_name\":\"$name_clean\", \"seller_name\":\"$seller_clean\", \"price\":$price, \"category_name\":\"$category_clean\", \"condition\":\"$condition_clean\"}"
    else
      echo "  {\"product_id\":\"$id_clean\", \"product_name\":\"$name_clean\", \"seller_name\":\"$seller_clean\", \"price\":$price, \"category_name\":\"$category_clean\", \"condition\":\"$condition_clean\"},"
    fi
  done < /tmp/products.csv
  echo "]"
} > /tmp/products.json

# Upload JSON data to MeiliSearch
curl -X POST 'http://localhost:7700/indexes/products/documents' \
  -H 'Content-Type: application/json' \
  --data-binary @/tmp/products.json
# Set searchableAttributes to restrict searchable fields
curl -X PUT 'http://localhost:7700/indexes/products/settings/searchable-attributes' \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "product_name",
    "seller_name",
    "category_name"
  ]'
# Set filterableAttributes to restrict filterable fields
curl -X PUT 'http://meilisearch-service.default.svc.cluster.local:7700/indexes/products/settings/filterable-attributes' \
  -H 'Content-Type: application/json' \
  --data-binary '[
    "seller_name",
    "category_name"
  ]'
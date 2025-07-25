#!/bin/bash

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenusr"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

LAST_SYNC_FILE="/tmp/last_sync_timestamp.txt"

if [ ! -f "$LAST_SYNC_FILE" ]; then
  echo "1970-01-01 00:00:00" > "$LAST_SYNC_FILE"
fi

LAST_SYNC=$(cat "$LAST_SYNC_FILE")

mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB --batch --raw --silent -e "
SELECT 
  p.product_id, 
  p.product_name, 
  ue.USERNAME AS seller_name, 
  p.price, 
  c.category_id, 
  c.category_name,
  p.product_condition
FROM Product p
JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
JOIN USER_GROUP_MEMBERSHIP ugm ON ue.ID = ugm.USER_ID
JOIN KEYCLOAK_GROUP kg ON ugm.GROUP_ID = kg.ID
JOIN Category c ON p.category_id = c.category_id
WHERE kg.NAME = 'Seller'
  AND GREATEST(
    IFNULL(p.last_update, '1970-01-01 00:00:00'),
    IFNULL(c.last_update, '1970-01-01 00:00:00')
  ) > '$LAST_SYNC'
" > /tmp/updated_products.csv

if [ -s /tmp/updated_products.csv ]; then
  jq -R -s -f <(echo '
    split("\n")[:-1] |
    map(split("\t")) |
    map({
      product_id: .[0],
      product_name: .[1],
      seller_name: .[2],
      price: (.[3] | tonumber),
      category_id: .[4],
      category_name: .[5],
      condition: .[6]
    })
  ') /tmp/updated_products.csv > /tmp/updated_products.json

  curl -X POST 'http://meilisearch-service.default.svc.cluster.local:7700/indexes/products/documents' \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/updated_products.json
fi

date '+%Y-%m-%d %H:%M:%S' > "$LAST_SYNC_FILE"
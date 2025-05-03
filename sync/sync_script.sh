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
SELECT p.product_id, p.product_name, s.seller_name, p.price
FROM Product p
JOIN Seller s ON p.seller_id = s.seller_id
WHERE p.last_update > '$LAST_SYNC'
" > /tmp/updated_products.csv

if [ -s /tmp/updated_products.csv ]; then
  jq -R -s -f <(echo 'split("\n")[:-1] | map(split("\t")) | map({product_id:.[0], product_name:.[1], seller_name:.[2], price:(.[3]|tonumber)})') /tmp/updated_products.csv > /tmp/updated_products.json

  curl -X POST 'http://meilisearch-service.default.svc.cluster.local:7700/indexes/products/documents' \
    -H 'Content-Type: application/json' \
    --data-binary @/tmp/updated_products.json
fi

date '+%Y-%m-%d %H:%M:%S' > "$LAST_SYNC_FILE"
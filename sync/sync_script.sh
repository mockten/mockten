#!/bin/bash
set -e

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenusr"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

MEILI_URL="http://meilisearch-service.default.svc.cluster.local:7700"
LAST_SYNC_FILE="/tmp/last_sync_timestamp.txt"

if [ ! -f "$LAST_SYNC_FILE" ]; then
  echo "1970-01-01 00:00:00" > "$LAST_SYNC_FILE"
fi

LAST_SYNC=$(cat "$LAST_SYNC_FILE")
WATERMARK=$(mysql --ssl-mode=DISABLED -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --silent -e "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s');" | head -n 1)

mysql --ssl-mode=DISABLED -h "$MYSQL_HOST" -u "$MYSQL_USER" -p"$MYSQL_PASS" -D "$MYSQL_DB" --batch --raw --silent -e "
SELECT
  p.product_id,
  p.product_name,
  ue.USERNAME AS seller_name,
  p.price,
  c.category_name,
  p.product_condition,
  t.stocks,
  p.avg_review,
  p.review_count,
  p.sale_flag,
  COALESCE(p.sale_id, '') AS sale_id,
  COALESCE(ts.discount_rate, 0.0) AS discount_rate,
  p.is_active,
  GREATEST(
    IFNULL(p.last_update, '1970-01-01 00:00:00'),
    IFNULL(c.last_update, '1970-01-01 00:00:00'),
    IFNULL(t.last_update, '1970-01-01 00:00:00')
  ) AS row_last_update
FROM Product p
JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
JOIN USER_GROUP_MEMBERSHIP ugm ON ue.ID = ugm.USER_ID
JOIN KEYCLOAK_GROUP kg ON ugm.GROUP_ID = kg.ID
JOIN Category c ON p.category_id = c.category_id
JOIN Stock t ON p.product_id = t.product_id
LEFT JOIN TimeSale ts ON p.sale_id = ts.id
WHERE kg.NAME = 'Seller'
HAVING row_last_update > '$LAST_SYNC' AND row_last_update <= '$WATERMARK'
" > /tmp/updated_products.tsv

if [ -s /tmp/updated_products.tsv ]; then
  # Split into active (upsert) and inactive (delete)
  awk -F'\t' '$13 == "1"' /tmp/updated_products.tsv > /tmp/active_products.tsv
  awk -F'\t' '$13 == "0"' /tmp/updated_products.tsv > /tmp/inactive_products.tsv

  # Upsert active products
  if [ -s /tmp/active_products.tsv ]; then
    jq -R -s '
      split("\n")[:-1]
      | map(split("\t"))
      | map({
          product_id: .[0],
          product_name: .[1],
          seller_name: .[2],
          price: (if (.[3] == null or .[3] == "") then 0 else (.[3] | tonumber) end),
          category_name: .[4],
          condition: .[5],
          stocks: (if (.[6] == null or .[6] == "") then 0 else (.[6] | tonumber) end),
          avg_review: (if (.[7] == null or .[7] == "") then 0 else (.[7] | tonumber) end),
          review_count: (if (.[8] == null or .[8] == "") then 0 else (.[8] | tonumber) end),
          sale_flag: (if .[9] == "1" then true else false end),
          sale_id: .[10],
          discount_rate: (if (.[11] == null or .[11] == "") then 0.0 else (.[11] | tonumber) end)
        })
    ' /tmp/active_products.tsv > /tmp/active_products.json

    http_code=$(curl -s -o /tmp/meili_sync_resp.txt -w "%{http_code}" -X POST "$MEILI_URL/indexes/products/documents?primaryKey=product_id" \
      -H 'Content-Type: application/json' \
      --data-binary @/tmp/active_products.json)

    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
      echo "Meili upsert failed (HTTP $http_code)"
      cat /tmp/meili_sync_resp.txt
      exit 1
    fi
  fi

  # Delete inactive products from MeiliSearch
  if [ -s /tmp/inactive_products.tsv ]; then
    awk -F'\t' '{print $1}' /tmp/inactive_products.tsv | jq -R -s 'split("\n")[:-1]' > /tmp/delete_ids.json
    http_code=$(curl -s -o /tmp/meili_del_resp.txt -w "%{http_code}" -X DELETE "$MEILI_URL/indexes/products/documents/delete-batch" \
      -H 'Content-Type: application/json' \
      --data-binary @/tmp/delete_ids.json)

    if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
      echo "Meili delete failed (HTTP $http_code)"
      cat /tmp/meili_del_resp.txt
      exit 1
    fi
  fi

  echo "$WATERMARK" > "$LAST_SYNC_FILE"
else
  echo "$WATERMARK" > "$LAST_SYNC_FILE"
fi

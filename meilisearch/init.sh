#!/bin/sh

# Start Meilisearch in background
/meilisearch --http-addr "0.0.0.0:7700" &

# Wait for Meilisearch to be available
until curl -s http://localhost:7700/health | grep -q '"status":"available"'; do
  echo "Waiting for Meilisearch..."
  sleep 1
done

# Create index
curl -X POST 'http://localhost:7700/indexes' \
  -H 'Content-Type: application/json' \
  -d '{"uid": "products"}'

# Upload product data
curl -X POST 'http://localhost:7700/indexes/products/documents' \
  -H 'Content-Type: application/json' \
  --data-binary @/data/products.json

# Keep container running
wait

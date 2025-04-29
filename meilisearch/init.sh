#!/bin/bash

# Start Meilisearch in background
./meilisearch --http-addr "0.0.0.0:7700" &

# Wait for Meilisearch to be available
until curl -s http://localhost:7700/health | grep -q '"status":"available"'; do
  echo "Waiting for MeiliSearch to be available..."
  sleep 1
done

# Create index
curl -X POST 'http://localhost:7700/indexes' \
  -H 'Content-Type: application/json' \
  -d '{"uid": "products"}'

# Fetch product data from MySQL
./load_mysql.sh
# Keep container running
wait

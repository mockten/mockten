#!/bin/bash
set -e

# Wait for postgres
until airflow db check 2>/dev/null; do
  echo "Waiting for Airflow DB..."
  sleep 2
done

# Init DB (idempotent)
airflow db migrate

# Create admin user (ignore error if already exists)
airflow users create \
  --username airflow \
  --password airflow \
  --firstname Admin \
  --lastname User \
  --role Admin \
  --email admin@mockten.local 2>/dev/null || true

exec "$@"

#!/bin/bash

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_PORT=3306

echo "Waiting for MySQL at $MYSQL_HOST:$MYSQL_PORT..."

while ! bash -c "</dev/tcp/${MYSQL_HOST}/${MYSQL_PORT}" 2>/dev/null; do
  echo "MySQL not yet available. Retrying in 2 seconds..."
  sleep 2
done

echo "MySQL is up. Starting Keycloak..."

if [ "$DEV_MODE" = "true" ]; then
  echo "DEV_MODE is true. Using realm-export-dev.json..."
  mkdir -p /opt/keycloak/data/import
  cp /opt/keycloak/staging/realm-export-dev.json /opt/keycloak/data/import/realm-export.json
else
  echo "Using standard realm-export.json..."
  mkdir -p /opt/keycloak/data/import
  cp /opt/keycloak/staging/realm-export.json /opt/keycloak/data/import/realm-export.json
fi

exec /opt/keycloak/bin/kc.sh start-dev \
  --import-realm \
  --db=mysql \
  --db-url=jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/mocktendb \
  --db-username=mocktenusr \
  --db-password=mocktenpassword \
  --http-port=80  \
  --log-level=DEBUG

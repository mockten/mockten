#!/bin/bash

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_PORT=3306

echo "Waiting for MySQL at $MYSQL_HOST:$MYSQL_PORT..."

while ! bash -c "</dev/tcp/${MYSQL_HOST}/${MYSQL_PORT}" 2>/dev/null; do
  echo "MySQL not yet available. Retrying in 2 seconds..."
  sleep 2
done

echo "MySQL is up. Starting Keycloak..."

mkdir -p /opt/keycloak/data/import
if [ "$DEV_MODE" = "true" ]; then
  echo "DEV_MODE is true. Using realm-export-dev.json..."
  cp /opt/keycloak/staging/realm-export-dev.json /opt/keycloak/data/import/realm-export.json
else
  echo "Using standard realm-export.json..."
  cp /opt/keycloak/staging/realm-export.json /opt/keycloak/data/import/realm-export.json
fi

# Inject the OAuth secrets into the realm import at runtime. The image ships the
# realm template with PLACEHOLDER tokens only; the real values arrive as env vars
# (Kubernetes: envFrom a Secret; Compose: the gitignored uam/uam.env), so nothing
# secret is ever baked into the pushed image. A key that is not set is left as its
# placeholder, so the realm still imports for local dev without that SSO provider.
IMPORT_FILE=/opt/keycloak/data/import/realm-export.json
for key in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET FACEBOOK_CLIENT_ID FACEBOOK_CLIENT_SECRET; do
  val="${!key}"
  if [ -n "$val" ]; then
    # Escape sed replacement metacharacters (\ & /) in the secret value.
    esc=$(printf '%s' "$val" | sed -e 's/[\\&/]/\\&/g')
    sed -i "s/\"${key}\"/\"${esc}\"/g" "$IMPORT_FILE"
    echo "Injected ${key} into realm import."
  else
    echo "WARN: ${key} is not set; leaving placeholder (SSO via this provider will not work)."
  fi
done

exec /opt/keycloak/bin/kc.sh start-dev \
  --import-realm \
  --db=mysql \
  --db-url=jdbc:mysql://${MYSQL_HOST}:${MYSQL_PORT}/mocktendb \
  --db-username=mocktenusr \
  --db-password=mocktenpassword \
  --db-pool-initial-size=1 \
  --db-pool-min-size=1 \
  --db-pool-max-size=5 \
  --cache=local \
  --http-port=80 \
  --log-level=WARN

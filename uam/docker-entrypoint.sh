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
# Three realms, and the deployment shape decides which. Cloud is checked first
# because it is the narrower condition: it splits the portals across four hosts,
# so its client origins cannot be baked in and are substituted below.
if [ "$MOCKTEN_MODE" = "cloud" ]; then
  echo "MOCKTEN_MODE is cloud. Using realm-export-cloud.json..."
  cp /opt/keycloak/staging/realm-export-cloud.json /opt/keycloak/data/import/realm-export.json
elif [ "$DEV_MODE" = "true" ]; then
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

# The cloud realm ships with PUBLIC_BASE_DOMAIN in place of the real domain, so
# no personal domain is committed. Substitute it the same way as the OAuth keys
# below. Without this the client would still only trust http://localhost, and
# every SSO round trip would come back to a redirect_uri the realm rejects.
if [ "$MOCKTEN_MODE" = "cloud" ]; then
  if [ -n "$PUBLIC_BASE_DOMAIN" ]; then
    esc_domain=$(printf '%s' "$PUBLIC_BASE_DOMAIN" | sed -e 's/[\\&/]/\\&/g')
    sed -i "s/PUBLIC_BASE_DOMAIN/${esc_domain}/g" "$IMPORT_FILE"
    # Confirm it actually happened rather than trusting sed's exit code. A silent
    # no-op here imports a realm that only trusts the literal host
    # "PUBLIC_BASE_DOMAIN", which fails at login time, far from the cause.
    if grep -q 'PUBLIC_BASE_DOMAIN' "$IMPORT_FILE"; then
      echo "ERROR: PUBLIC_BASE_DOMAIN is still present in the realm import after substitution." >&2
      exit 1
    fi
    echo "Substituted PUBLIC_BASE_DOMAIN into the cloud realm import."
  else
    echo "ERROR: MOCKTEN_MODE=cloud but PUBLIC_BASE_DOMAIN is not set." >&2
    echo "ERROR: The realm would only trust the literal host 'PUBLIC_BASE_DOMAIN'," >&2
    echo "ERROR: so every login would fail with redirect_uri_mismatch. Refusing to start." >&2
    exit 1
  fi
fi

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

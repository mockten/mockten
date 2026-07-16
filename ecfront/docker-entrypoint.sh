#!/bin/sh
set -e

# Render the frontend's runtime configuration from this container's environment,
# then hand over to nginx. Nothing environment-specific is baked into the image,
# so the same artifact runs in every environment and carries no credentials —
# the deployment (k8s Secret/ConfigMap, or a cloud deploy pipeline) supplies the
# values as env vars.
CONFIG_FILE=/usr/share/nginx/html/config.js

if [ -z "${STRIPE_PUBLIC_KEY}" ]; then
  echo "WARN: STRIPE_PUBLIC_KEY is not set on this container." >&2
  echo "WARN: The storefront will serve, but card payments cannot work." >&2
fi

# Escape backslashes and double quotes so a stray value can't break out of the
# JS string literal.
escape_js() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

cat > "$CONFIG_FILE" <<EOF
// Generated at container start by docker-entrypoint.sh — do not edit.
window.__APP_CONFIG__ = {
  STRIPE_PUBLIC_KEY: "$(escape_js "${STRIPE_PUBLIC_KEY}")"
};
EOF

exec nginx -g 'daemon off;'

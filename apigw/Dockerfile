FROM kong/kong-gateway:3.9

USER root

RUN apt-get update && apt-get upgrade -y && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV KONG_DATABASE=off \
    KONG_PROXY_LISTEN=0.0.0.0:8082 \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_ADMIN_GUI_LISTEN=0.0.0.0:8002 \
    KONG_DECLARATIVE_CONFIG=/kong/kong.yaml \
    KONG_PROXY_ACCESS_LOG=/tmp/access.log \
    KONG_PROXY_ERROR_LOG=/tmp/error.log \
    KONG_LOG_LEVEL=debug \
    KONG_ROUTER_FLAVOR=expressions \
    KONG_DNS_RESOLVER=127.0.0.11 \
    KONG_DNS_STALE_TTL=0

COPY kong.yaml /kong/kong.yaml

ENTRYPOINT ["/bin/sh", "-c", "set -x && apt update || true && kong migrations bootstrap && kong start && tail -f /tmp/access.log /tmp/error.log"]

EXPOSE 8082 8001 8002

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD kong health || exit 1

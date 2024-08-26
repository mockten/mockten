FROM kong/kong-gateway:2.8.1.0-alpine

USER root

ENV KONG_DATABASE=off \
    KONG_PROXY_LISTEN=0.0.0.0:8082 \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_ADMIN_GUI_LISTEN=0.0.0.0:8002 \
    KONG_DECLARATIVE_CONFIG=/kong/kong.yaml

COPY kong.yaml /kong/kong.yaml

ENTRYPOINT /bin/sh -c "set -x && apk update && kong migrations bootstrap && kong start --vv && tail -f /dev/null"

EXPOSE 8082 8001 8002

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD kong health || exit 1

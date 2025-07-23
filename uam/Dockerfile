FROM alpine:3.19 AS builder

RUN apk add --no-cache jq
COPY config.json /tmp/config.json
COPY realm-export.json /tmp/realm-export.json
RUN jq -r 'to_entries[] | "s/\\\"" + .key + "\\\"/\\\"" + .value + "\\\"/g"' /tmp/config.json \
  | xargs -I{} sed -i -e '{}' /tmp/realm-export.json

FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin
ENV QUARKUS_LOG_CONSOLE_FORMAT="%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{2.}] (%t) %s%e%n"
ENV QUARKUS_LOG_CATEGORY__IO_QUARKUS_HTTP_ACCESS_LOGGER__LEVEL=DEBUG
ENV QUARKUS_HTTP_ACCESS_LOG_ENABLED=true

COPY --from=builder /tmp/realm-export.json /opt/keycloak/data/import/realm-export.json
COPY docker-entrypoint.sh /opt/keycloak/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/opt/keycloak/docker-entrypoint.sh"]

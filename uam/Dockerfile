FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin
ENV QUARKUS_LOG_CONSOLE_FORMAT="%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{2.}] (%t) %s%e%n"
ENV QUARKUS_LOG_CATEGORY__IO_QUARKUS_HTTP_ACCESS_LOGGER__LEVEL=DEBUG
ENV QUARKUS_HTTP_ACCESS_LOG_ENABLED=true
ENV KC_HOSTNAME=http://host.docker.internal:8082   
# KC_HOSTNAME ... to be removed

COPY realm-export.json /opt/keycloak/data/import/realm-export.json

EXPOSE 8080


ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start-dev", "--import-realm","--log-level=DEBUG"]

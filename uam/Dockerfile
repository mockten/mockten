FROM quay.io/keycloak/keycloak:latest

ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin
ENV QUARKUS_LOG_CONSOLE_FORMAT="%d{yyyy-MM-dd HH:mm:ss} %-5p [%c{2.}] (%t) %s%e%n"
ENV QUARKUS_LOG_CATEGORY__IO_QUARKUS_HTTP_ACCESS_LOGGER__LEVEL=DEBUG
ENV QUARKUS_HTTP_ACCESS_LOG_ENABLED=true

# Switch to root to create staging directory and change ownership
USER root
RUN mkdir -p /opt/keycloak/staging && chown -R keycloak:keycloak /opt/keycloak/staging
USER keycloak

# The realm templates ship with PLACEHOLDER tokens (GOOGLE_CLIENT_ID,
# FACEBOOK_CLIENT_SECRET, …), never real credentials. The actual OAuth secrets
# are substituted into the realm import at container startup from environment
# variables (see docker-entrypoint.sh), so no secret is ever baked into — or
# pushed with — this image. In Kubernetes, supply those env vars from a Secret
# via envFrom; for local Compose they come from the gitignored uam/uam.env.
COPY --chown=keycloak:keycloak realm-export.json /opt/keycloak/staging/realm-export.json
COPY --chown=keycloak:keycloak realm-export-dev.json /opt/keycloak/staging/realm-export-dev.json
COPY docker-entrypoint.sh /opt/keycloak/docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/opt/keycloak/docker-entrypoint.sh"]

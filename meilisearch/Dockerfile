FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y curl default-mysql-client ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install MeiliSearch
RUN curl -L https://install.meilisearch.com | sh

# Make sure init.sh is copied
COPY *.sh /
RUN chmod +x /*.sh

# Expose default MeiliSearch port
EXPOSE 7700

# Set entrypoint to our init script
ENTRYPOINT ["/init.sh"]
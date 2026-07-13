FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y curl default-mysql-client ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install MeiliSearch (arch-aware)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
      MSARCH="meilisearch-linux-aarch64"; \
    else \
      MSARCH="meilisearch-linux-amd64"; \
    fi && \
    curl -L "https://github.com/meilisearch/meilisearch/releases/latest/download/${MSARCH}" -o /usr/local/bin/meilisearch && \
    chmod +x /usr/local/bin/meilisearch

# Make sure init.sh is copied
COPY *.sh /
RUN chmod +x /*.sh

# Expose default MeiliSearch port
EXPOSE 7700

# Set entrypoint to our init script
ENTRYPOINT ["/init.sh"]

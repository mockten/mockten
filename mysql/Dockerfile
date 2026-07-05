FROM alpine:3.19 AS gosu-downloader
RUN apk add --no-cache curl
RUN arch=$(uname -m); \
    if [ "$arch" = "x86_64" ]; then gosu_arch="amd64"; \
    elif [ "$arch" = "aarch64" ]; then gosu_arch="arm64"; \
    else gosu_arch="amd64"; fi; \
    curl -L -o /gosu "https://github.com/tianon/gosu/releases/download/1.17/gosu-${gosu_arch}" && \
    chmod +x /gosu

FROM mysql:8.4
COPY --from=gosu-downloader /gosu /usr/local/bin/gosu
RUN rm -rf /usr/lib/mysqlsh
COPY init.sql /docker-entrypoint-initdb.d/
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash curl jq default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

COPY *.sh /
RUN chmod +x /*.sh

CMD ["bash", "-c", "while true; do sleep 300; /sync_script.sh; done"]

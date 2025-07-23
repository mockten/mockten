FROM debian:12.11-slim

RUN apt-get update && apt-get install -y curl jq default-mysql-client

COPY *.sh /
RUN chmod +x /*.sh

CMD ["bash", "-c", "while true; do sleep 300; /sync_script.sh; done"]

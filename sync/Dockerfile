FROM alpine:latest

RUN apk add --no-cache bash curl jq mariadb-client

COPY *.sh /
RUN chmod +x /*.sh

CMD ["bash", "-c", "while true; do sleep 300; /sync_script.sh; done"]

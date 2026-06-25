FROM alpine:3

RUN apk add --no-cache bash curl jq mysql-client

COPY *.sh /
RUN chmod +x /*.sh

CMD ["bash", "-c", "while true; do sleep 300; /sync_script.sh; done"]

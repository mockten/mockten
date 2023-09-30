FROM golang:1.20.1 as builder

RUN apt-get update &&\
    apt-get -y install sysv-rc-conf
RUN mkdir -p /go/src/notification
WORKDIR /go/src/notification
COPY . .
RUN test -f notification.go || echo "notification.go not found"
RUN go build .


FROM alpine:3.18.4
RUN apk add --no-cache ca-certificates &&\
    apk add gcompat &&\
    mkdir /var/log/apl
COPY --from=builder /go/src/notification/notification /notification
COPY --from=builder /go/src/notification/config.ini  /
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /notification &&\
    chown sys-user:sys-user /config.ini &&\
    chown sys-user:sys-user /var/log/apl
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["./notification"]
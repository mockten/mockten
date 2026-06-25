FROM golang:1.26-alpine AS builder

RUN mkdir -p /go/src/notification
WORKDIR /go/src/notification
COPY . .
RUN test -f notification.go || echo "notification.go not found"
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o notification .


FROM alpine:3
RUN apk add --no-cache ca-certificates && mkdir /var/log/apl
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
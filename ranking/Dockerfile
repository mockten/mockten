FROM golang:1.26-alpine AS builder

WORKDIR /go/src/ranking
COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o ranking .

FROM alpine:3
RUN apk add --no-cache ca-certificates && mkdir /var/log/apl
COPY --from=builder /go/src/ranking/ranking /ranking
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /ranking &&\
    chown sys-user:sys-user /var/log/apl
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["./ranking"]

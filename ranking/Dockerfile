FROM golang:1.25 as builder

WORKDIR /go/src/ranking
COPY . .
RUN go mod tidy
RUN go build -o ranking .

FROM alpine:3
RUN apk add --no-cache ca-certificates &&\
    apk add gcompat &&\
    mkdir /var/log/apl
COPY --from=builder /go/src/ranking/ranking /ranking
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /ranking &&\
    chown sys-user:sys-user /var/log/apl
HEALTHCHECK --interval=5m --timeout=30s \
    CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["./ranking"]

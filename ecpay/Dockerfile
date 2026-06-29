FROM golang:1.26-alpine AS builder

RUN ARCH=$(uname -m | sed 's/x86_64/x86_64/;s/aarch64/aarch_64/') && \
    apk --no-cache add curl unzip && \
    curl -OL https://github.com/google/protobuf/releases/download/v3.11.2/protoc-3.11.2-linux-${ARCH}.zip && \
    unzip protoc-3.11.2-linux-${ARCH}.zip -d protoc3 && \
    rm protoc-3.11.2-linux-${ARCH}.zip

RUN mkdir -p /go/src/ecpay
WORKDIR /go/src/ecpay
COPY . .
RUN go get github.com/gin-contrib/cors && \
    go get github.com/gin-gonic/gin && \
    go get github.com/stripe/stripe-go/v74 && \
    go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o ecpay .
FROM alpine:3
RUN apk add --no-cache ca-certificates && mkdir /var/log/apl
# RUN ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2 &&\
COPY --from=builder /go/src/ecpay/ecpay /ecpay
COPY --from=builder /go/src/ecpay/config.ini  /config.ini
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /ecpay &&\
    chown sys-user:sys-user /var/log/apl &&\
    chown sys-user:sys-user /config.ini
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["./ecpay"]

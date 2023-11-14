FROM golang:1.20.1 as builder

RUN apt-get update &&\
    apt-get -y install sysv-rc-conf &&\
    apt-get -y install unzip &&\
    curl -OL https://github.com/google/protobuf/releases/download/v3.11.2/protoc-3.11.2-linux-x86_64.zip &&\
    unzip protoc-3.11.2-linux-x86_64.zip -d protoc3

RUN mkdir -p /go/src/ecpay
WORKDIR /go/src/ecpay
COPY . .
RUN go build .

FROM alpine:3.18.4
RUN apk add --no-cache ca-certificates &&\
    apk add gcompat &&\
    mkdir /var/log/apl
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

FROM golang:1.20.1 as builder

RUN apt-get update &&\
    apt-get -y install --no-install-recommends sysv-rc-conf=0.99-7
WORKDIR /go/src
RUN mkdir notification
WORKDIR /go/src/notification
COPY . .
RUN go build notification.go

FROM alpine:3.15.0
RUN apk add --no-cache ca-certificates=20211220-r0
RUN mkdir /lib64 &&\
    ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2 &&\
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
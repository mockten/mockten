FROM golang:1.20.1 as builder

RUN apt-get update &&\
    apt-get -y install --no-install-recommends sysv-rc-conf &&\
    apt-get -y install --no-install-recommends unzip &&\
    curl -OL https://github.com/google/protobuf/releases/download/v3.11.2/protoc-3.11.2-linux-x86_64.zip &&\
    unzip protoc-3.11.2-linux-x86_64.zip -d protoc3
WORKDIR /go/src
RUN mkdir ranking
WORKDIR /go/src/ranking
RUN ls /go/src
COPY . .
RUN go build .

FROM alpine:3.15.0
RUN apk add --no-cache ca-certificates
RUN mkdir /lib64 &&\
    ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2 &&\
    mkdir /var/log/apl
COPY --from=builder /go/src/ranking/ranking.git /ranking.git
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /ranking.git &&\
    chown sys-user:sys-user /var/log/apl
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["./ranking.git"]

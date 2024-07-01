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

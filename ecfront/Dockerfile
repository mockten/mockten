# Build Container
FROM golang:1.20.1 as builder

RUN apt-get update &&\
    apt-get -y install --no-install-recommends sysv-rc-conf &&\
    apt-get -y install --no-install-recommends unzip &&\
    curl -OL https://github.com/google/protobuf/releases/download/v3.11.2/protoc-3.11.2-linux-x86_64.zip &&\
    unzip protoc-3.11.2-linux-x86_64.zip -d protoc3
WORKDIR /go/src
RUN mkdir ecfront
WORKDIR /go/src/ecfront
COPY . .
# Build
RUN go build .

FROM alpine:3.18.5
RUN apk add --no-cache ca-certificates &&\
    apk add gcompat
RUN mkdir /var/log/apl && \
    mkdir apl

WORKDIR /apl/
COPY templates ./templates
COPY assets ./assets
RUN mkdir -p /mnt/storage
COPY --from=builder /go/src/ecfront/ecfront /apl/ecfront
COPY --from=builder /go/src/ecfront/config.ini.prd /apl/config.ini
RUN addgroup -g 1234 sys-group  &&\
    adduser sys-user --disabled-password &&\
    addgroup sys-user sys-group &&\
    chown sys-user:sys-user /apl/ecfront &&\
    chown sys-user:sys-user /var/log/apl &&\
    chown sys-user:sys-user /apl/config.ini &&\
    chown sys-user:sys-user /mnt/storage &&\
    chown sys-user:sys-user /apl/assets/img &&\
    ln -sfn /mnt/storage /apl/assets/img/
    
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["/apl/ecfront"]


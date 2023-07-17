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

FROM alpine:3.18.2
ENV GOLANG_VERSION 1.14.10

ENV BUILD_DEPS \
    go\
    git \
    tar \
    wget \
    build-base \
    fuse-dev \
    curl-dev

ENV GOPATH /tmp/go
ENV GO15VENDOREXPERIMENT 1
ENV GCS_BUCKET_NAME go-portforio-apl-file
COPY gcsfuse /usr/local/bin
RUN chmod +x /usr/local/bin/gcsfuse
# Setup necessary library
RUN set -xe && \
    apk add --no-cache go && \
    apk add --no-cache git
RUN apk add --no-cache tar  && \
    apk add --no-cache wget && \
    apk add --no-cache build-base
RUN apk add --no-cache fuse-dev && \ 
    apk add --no-cache curl-dev && \
    apk add --no-cache fuse && \
    apk del $BUILD_DEPS && \
    rm -rf /tmp/*
RUN apk add --no-cache ca-certificates && \
    apk add gcompat && \
    mkdir /var/log/apl && \
    mkdir apl
WORKDIR /apl/
COPY templates ./templates
COPY assets ./assets
RUN mkdir -p /mnt/gcs/$GCS_BUCKET_NAME
COPY --from=builder /go/src/ecfront/ecfront /apl/ecfront
COPY --from=builder /go/src/ecfront/docker-entory.sh /apl/docker-entory.sh
COPY --from=builder /go/src/ecfront/config.ini.prd /apl/config.ini
RUN addgroup -g 1234 sys-group  &&\
    adduser sys-user --disabled-password &&\
    addgroup sys-user sys-group &&\
    chown sys-user:sys-user /apl/ecfront &&\
    chown sys-user:sys-user /var/log/apl &&\
    chown sys-user:sys-user /apl/config.ini &&\
    chown sys-user:sys-user /apl/docker-entory.sh &&\
    chown sys-user:sys-user /mnt/gcs/$GCS_BUCKET_NAME &&\
    chmod +x /apl/docker-entory.sh &&\
    echo '' >> /etc/fuse.conf &&\
    echo 'user_allow_other' >> /etc/fuse.conf &&\
    chown sys-user:sys-user /apl/assets/img
    
HEALTHCHECK --interval=5m --timeout=30s \
CMD curl -f http://localhost:9100/metrics || exit 1
USER sys-user
ENTRYPOINT ["/apl/docker-entory.sh"]

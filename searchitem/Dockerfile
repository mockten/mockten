# multi stage build
FROM golang:1.20.1 as builder
WORKDIR /go/setenv
ENV GOROOT /usr/local/go/
ENV CGO_ENABLED=0
RUN mkdir setenv && \
    apt-get update && \
    apt-get -y install vim && \
    apt-get -y install unzip
#RUN go get github.com/fluent/fluent-logger-golang/fluent && \
#    go get github.com/prometheus/client_golang/prometheus/promhttp && \
#    go get github.com/prometheus/client_golang/prometheus/promauto && \
    # go get github.com/prometheus/client_golang/prometheus && \
    # go get -u github.com/go-sql-driver/mysql && \
    # go get -u google.golang.org/grpc && \
    # go get -u github.com/golang/protobuf/protoc-gen-go
RUN curl -OL https://github.com/google/protobuf/releases/download/v3.11.2/protoc-3.11.2-linux-x86_64.zip && \
    unzip protoc-3.11.2-linux-x86_64.zip -d protoc3 && \
    mv protoc3/bin/* /usr/local/bin/ && \
    mv protoc3/include/* /usr/local/include/ && \
    rm -rf protoc-3.11.2-linux-x86_64.zip protoc3
COPY . .
COPY pb/searchItem.pb.go $GOROOT/src/pb/
RUN go build search.go

# As runner
FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder  /go/setenv/search .
CMD ["./search"]
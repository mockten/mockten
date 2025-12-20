# multi stage build
FROM golang:1.23.9 as builder
WORKDIR /go/setenv
ENV CGO_ENABLED=0
RUN mkdir setenv && \
    apt-get update && \
    apt-get -y install vim && \
    apt-get -y install unzip
COPY . .
RUN go build .

# As runner
FROM alpine:3
RUN apk --no-cache add ca-certificates &&\
    apk add gcompat
COPY --from=builder  /go/setenv/product .
CMD ["./product"]
FROM golang:1.26-alpine AS builder
WORKDIR /go/setenv
ENV CGO_ENABLED=0
COPY cart ./cart
COPY common ./common
RUN cd ./cart && go build -ldflags="-s -w" .

FROM alpine:3
RUN apk --no-cache add ca-certificates
COPY --from=builder /go/setenv/cart .
CMD ["./cart"]
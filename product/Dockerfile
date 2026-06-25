FROM golang:1.26-alpine AS builder
WORKDIR /go/setenv
ENV CGO_ENABLED=0
COPY . .
RUN go build -ldflags="-s -w" .

FROM alpine:3
RUN apk --no-cache add ca-certificates
COPY --from=builder /go/setenv/product .
CMD ["./product"]
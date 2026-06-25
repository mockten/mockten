FROM golang:1.26-alpine AS builder

WORKDIR /go/src/sale
COPY . .
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o sale .

FROM alpine:3
RUN apk add --no-cache ca-certificates && mkdir /var/log/apl
COPY --from=builder /go/src/sale/sale /sale
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /sale &&\
    chown sys-user:sys-user /var/log/apl
USER sys-user
ENTRYPOINT ["./sale"]

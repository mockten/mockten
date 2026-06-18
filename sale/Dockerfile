FROM golang:1.25 as builder

WORKDIR /go/src/sale
COPY . .
RUN go mod tidy
RUN go build -o sale .

FROM alpine:3
RUN apk add --no-cache ca-certificates &&\
    apk add gcompat &&\
    mkdir /var/log/apl
COPY --from=builder /go/src/sale/sale /sale
RUN adduser sys-user --disabled-password &&\
    chown sys-user:sys-user /sale &&\
    chown sys-user:sys-user /var/log/apl
USER sys-user
ENTRYPOINT ["./sale"]

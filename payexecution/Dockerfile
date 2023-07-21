FROM golang:1.20.1 as builder
WORKDIR /
COPY . .
RUN go build .

# As runner
FROM alpine:3.14
RUN apk --no-cache add ca-certificates
RUN mkdir /lib64
RUN ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2
COPY --from=builder  /payexecution .
ENTRYPOINT ["./payexecution", "-debug"]

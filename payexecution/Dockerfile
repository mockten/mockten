FROM golang:1.20.1 as builder
WORKDIR /
COPY . .
RUN go build .

# As runner
FROM alpine:3
RUN apk --no-cache add ca-certificates &&\
    apk add gcompat
COPY --from=builder  /payexecution .
ENTRYPOINT ["./payexecution", "-debug"]

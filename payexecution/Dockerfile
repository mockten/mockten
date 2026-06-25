FROM golang:1.26-alpine AS builder
WORKDIR /
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o payexecution .

# As runner
FROM alpine:3
RUN apk --no-cache add ca-certificates
COPY --from=builder /payexecution .
ENTRYPOINT ["./payexecution", "-debug"]

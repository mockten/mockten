FROM golang:1.26-alpine AS builder
WORKDIR /app

# Copy sources only (no host go.mod/go.sum needed)
COPY main.go .
COPY config.json .

# Init fresh module in container (stdlib only)
RUN go mod init nominatim-geocode-svc && go mod tidy

# Build static binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/geocode-service main.go

FROM alpine:3
WORKDIR /app
COPY --from=builder /app/geocode-service /app/geocode-service
COPY --from=builder /app/config.json /app/config.json
EXPOSE 8080
CMD ["/app/geocode-service"]

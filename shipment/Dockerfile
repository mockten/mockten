FROM golang:1.26-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o shipment-service main.go

FROM alpine:3
WORKDIR /app
COPY --from=builder /app/shipment-service .

EXPOSE 8080

CMD ["./shipment-service"]

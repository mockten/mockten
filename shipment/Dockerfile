FROM golang:1.26 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -o shipment-service main.go

FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/shipment-service .

EXPOSE 8080

CMD ["./shipment-service"]

# ecpay

Payment service (Go) — Stripe-backed payment methods and checkout.

`ecpay` manages the authenticated user's saved payment methods and executes payments through Stripe. It exposes an HTTP API (Gin) for the storefront and also carries a gRPC transaction handler; card data is tokenized by Stripe and never persisted in raw form. On a successful payment it records the order in MySQL and triggers the shipment and ranking services.

## Layout

```
ecpay/
├── api.go          # Gin HTTP server (:8080): payment-method CRUD + checkout
├── server.go       # gRPC transaction handler, Stripe helpers, Prometheus metrics (:9100)
├── api_test.go     # unit tests (JWT claim → user extraction)
├── config.ini      # service configuration
├── go.mod / go.sum
└── Dockerfile
```

- **HTTP** (`api.go`) listens on `:8080` and serves the `/api/payment*` surface.
- **Metrics** (`server.go`) exposes Prometheus counters on `:9100`.

## Endpoints (exposed via Kong as `/api/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payment-method` | List the user's saved payment methods (masked). |
| POST | `/api/payment-method` | Register a card — tokenized via Stripe, only the token reference is stored. |
| PUT | `/api/payment-method/default` | Set a saved method as the default. |
| DELETE | `/api/payment-method` | Remove a saved method and detach it in Stripe. |
| POST | `/api/payment` | Execute a payment (Stripe PaymentIntent), record the `Order`, and trigger shipment + ranking. |

## Authentication

The acting user is derived from the Bearer JWT via `parseUserFromAuthHeader` (email → preferred_username → sub), with a mock testuser fallback when no valid header is present. The gateway is responsible for authentication.

## Configuration

- `config.ini` — service settings (including Stripe configuration).
- Downstream services are reached at their in-cluster URLs (e.g. `http://ranking-service:8080`).

## Running tests

```sh
cd ecpay
go test ./...
```

Unit tests cover `parseUserFromAuthHeader` (all claim-fallback branches). Tests run automatically in CI (`build_ecpay` job).

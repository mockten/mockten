# shipment

Shipment / delivery service (Go, net/http).

`shipment` handles shipping for placed orders — creating shipment records and advancing a delivery state machine (`preparing` → `in_transit` → `delivered`) on a configurable tick interval. It integrates with the order flow driven by [`sale`](../sale) and stores state in MySQL.

## Layout

```
shipment/
├── main.go        # entrypoint, HTTP mux, shipment handler, delivery state machine
├── main_test.go   # unit tests (TEST_MODE toggle)
├── go.mod / go.sum
└── Dockerfile
```

The service registers its routes on a `net/http` mux (with a CORS middleware) and listens on the port given by `PORT`.

## Endpoints (internal `/v1`, exposed via Kong as `/api/shipment`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/v1/shipment` | Query shipment records for a user, or create a shipment and start the delivery state machine. |
| GET | `/health` | Liveness check. |

## Configuration

| Env var | Purpose |
|---------|---------|
| `MYSQL_DSN` | MySQL connection string. |
| `PORT` | HTTP listen port. |
| `TICK_INTERVAL_SECONDS` | How often the delivery state machine advances a shipment. |
| `TEST_MODE` | When `true`, enables test-mode behavior (`isTestMode()`) so the local end-to-end scenarios can exercise shipments without external carriers. |

## Running tests

```sh
cd shipment
go test ./...
```

Unit tests cover the `isTestMode` toggle. Tests run automatically in CI (`build_shipment` job).

# cart

Shopping cart service (Go), backed by Redis.

`cart` stores each user's in-progress cart and exposes an HTTP API to add, update, remove, and read cart items. Carts are keyed by user and persisted in Redis so they survive between sessions.

## Layout

```
cart/
├── main.go                 # entrypoint, config, HTTP server wiring
├── internal/
│   ├── cartstore/          # Redis-backed cart persistence
│   ├── http/               # HTTP handlers / routing
│   ├── model/              # cart domain types (RedisCart, RedisCartItem, …)
│   ├── productrepo/        # product lookups for enriching cart items
│   └── service/            # cart business logic
└── Dockerfile
```

## Configuration

Configuration is read from environment variables (see `getenvInt` / `getenvDurationSeconds` in `main.go`), including the Redis connection and item TTLs.

## Running tests

```sh
cd cart
go test ./...
```

Unit tests cover the cart store index lookup and env-var parsing helpers. These also run in CI (`build_cart` job).

## Build note

The container is built from the **repository root** so it can access the shared Go module:

```sh
docker build -f cart/Dockerfile -t cart:latest .
```

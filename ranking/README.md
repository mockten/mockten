# ranking

Product ranking service (Go, Gin) backed by Redis.

`ranking` serves best-seller rankings for the storefront and keeps them updated in real time. Rankings are stored as monthly Redis sorted sets (one per category plus an "all" set); each purchase bumps the relevant products' scores. Product metadata for the ranked ids is hydrated from MySQL.

## Layout

```
ranking/
├── server.go        # entrypoint, Redis/MySQL setup, ranking handlers, key helper
├── ranking_test.go  # unit tests (rankingZSetKey)
├── go.mod / go.sum
└── Dockerfile
```

## Endpoints (exposed via Kong as `/api/ranking`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ranking` | Top products for the current month; optional `category` query (defaults to the cross-category "all" set). |
| — | (update) | `handleUpdateRanking` bumps a product's score in the monthly sorted set on purchase events. |

## Key functions

- `rankingZSetKey(month, category)` — builds the Redis sorted-set key (`ranking:<month>:<category>` or `…:all`) and returns the numeric category id used in the response.
- `handleGetRanking` — reads the top 10 from Redis and hydrates each product from MySQL.

## Configuration

| Env var | Purpose |
|---------|---------|
| `REDIS_HOST` / `REDIS_PASSWORD` | Redis connection (defaults to `localhost:6379`). |
| MySQL connection | For hydrating product metadata. |

## Running tests

```sh
cd ranking
go test ./...
```

Unit tests cover `rankingZSetKey` (all branches). Tests run automatically in CI (`build_ranking` job).

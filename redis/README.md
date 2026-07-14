# redis

In-memory cache and cart/ranking backing store (Redis).

`redis` provides low-latency key/value storage for the platform. Its main consumers are [`cart`](../cart) (persists each user's shopping cart so it survives between sessions) and [`ranking`](../ranking) (monthly sorted sets of product scores updated on each purchase).

## Layout

```
redis/
├── redis.conf   # mockten-specific Redis configuration
└── Dockerfile   # Redis image
```

## Usage

- **Cart** — cart items are stored keyed by user id with a configurable TTL (see `cart`'s `getenvDurationSeconds`).
- **Ranking** — best-seller rankings live in sorted sets keyed `ranking:<month>:<category>` (and `…:all`).
- Reached in-cluster at `redis-service.default.svc.cluster.local:6379`.

## Configuration

Tune persistence, memory limits, and eviction policy in `redis.conf`; the value is applied when the container starts.

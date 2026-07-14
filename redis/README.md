# redis

In-memory cache and cart backing store (Redis).

`redis` provides low-latency key/value storage for the platform. Its primary consumer is the [`cart`](../cart) service, which persists each user's shopping cart here so it survives between sessions.

## Contents

- `Dockerfile` — Redis image with any mockten-specific configuration.

## Usage

- Cart items are stored keyed by user with a configurable TTL (see `cart`'s `getenvDurationSeconds`).
- Reached in-cluster at `redis-service.default.svc.cluster.local:6379`.

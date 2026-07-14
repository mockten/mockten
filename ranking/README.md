# ranking

Product ranking service (Go, gRPC).

`ranking` computes and serves product rankings (e.g. best-sellers / most-viewed) for the storefront. It exposes a gRPC API and is consumed by other services and the frontend via the API gateway.

## Layout

- `*.go` — gRPC server implementation and ranking logic.
- `*_test.go` — unit tests (bufconn-based gRPC tests).
- `Dockerfile` — container image.

## Running tests

```sh
cd ranking
go test ./...
```

Tests run automatically in CI (`build_ranking` job).

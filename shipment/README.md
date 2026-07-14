# shipment

Shipment / delivery service (Go).

`shipment` handles shipping for placed orders — calculating shipping options and recording delivery state. It integrates with the order flow driven by [`sale`](../sale).

## Configuration

- `TEST_MODE=true` enables test-mode behavior (see `isTestMode()` in `main.go`), used by the local end-to-end scenarios so shipments can be exercised without external carriers.

## Running tests

```sh
cd shipment
go test ./...
```

Unit tests cover the test-mode toggle. Tests run automatically in CI (`build_shipment` job).

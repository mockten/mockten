# sale

Orders / sales service (Go).

`sale` records completed orders and exposes the APIs the storefront and the **Admin Portal** use to review sales activity. In addition to order data, it powers the admin monitoring and audit features.

## Endpoints

- **Orders** — create and query orders and transactions.
- **`/v1/admin/orders`** — returns *flagged* orders for admin review, with a derived reason per order:
  - Failed / canceled
  - Unusual location (EU shipping destination, detected via `geocoding` country code)
  - Multiple rapid orders (≥ 3 within 15 minutes from the same buyer)
  - High value (order amount ≥ $200)
- **`/v1/admin/audit`** — reads and appends platform audit-log entries (`AuditLog` table).
- **`/v1/admin/health`** — reports component health and operational metrics derived from live database state (e.g. out-of-stock ratio for the Catalog/Inventory component).

## Running tests

```sh
cd sale
go test ./...
```

Unit tests cover the `max1` helper and the EU-country classification map used for order flagging. These also run in CI.

## Related

- Order/audit tables and seed data live in [`mysql`](../mysql).
- The Admin Portal UI that consumes these endpoints lives in [`ecfront2/src/pages/admin`](../ecfront2).

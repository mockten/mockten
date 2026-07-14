# mysql

Primary relational datastore (MySQL).

`mysql` is the source of truth for products, orders/transactions, sellers, geo data, payments, and the platform audit log. The container initializes the schema and seed data on first start; the [`sync`](../sync) job mirrors product changes into Meilisearch.

## Layout

```
mysql/
├── init.sql            # schema + seed data, run as root at container init
├── all_products.json   # bulk product seed data
├── test_insert.sql     # ad-hoc insert helpers
├── seeder/             # Python behavior seeder + Playwright simulation for realistic data
│   ├── behavior_seeder.py
│   ├── playwright_simulation.ts
│   └── verify.sql
└── Dockerfile          # MySQL image with init.sql baked in
```

## Schema

Core tables created by `init.sql` include:

| Domain | Tables |
|--------|--------|
| Catalog | `Product`, `Category`, `Stock`, `Review`, `Wishlist`, `BrowsingHistory` |
| Sellers | `Seller`, `TimeSale` |
| Orders & payment | `Order`, `Transaction`, `Payment`, `PaymentMethod`, `PaymentProfile` |
| Shipping & geo | `Geo`, `ShippingRate`, `AirCost`, `DomesticAirCost`, `SeaCost` |
| Ops / admin | `AuditLog` (Admin Portal activity log), `DashboardMetrics`, `ApiSLA` |

The `AuditLog` table backs the Admin Portal's Activity Logs, and `init.sql` also seeds rows that demonstrate admin **order flagging** (canceled orders, rapid-order bursts, an EU shipping destination, and high-value orders).

## Notes

- The application connects as a limited user (`mocktenusr`) with a read-mostly variant (`mocktenro`). Privileged seed/DDL runs **only** via `init.sql` at init time (as `root`). To change seed data, edit `init.sql` and rebuild — direct inserts as the app user are denied by design.
- Reached in-cluster at `mysql-service.default.svc.cluster.local`.

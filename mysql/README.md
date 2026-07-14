# mysql

Primary relational datastore (MySQL).

`mysql` is the source of truth for products, orders/transactions, sellers, geo data, and the platform audit log. The container initializes the schema and seed data on first start.

## Contents

- `init.sql` — schema definition and seed data, run as `root` at container init. This includes:
  - Core tables (Product, Order, Transaction, Seller, Geo, …).
  - `AuditLog` — platform activity log surfaced in the Admin Portal.
  - Seed rows that demonstrate admin **order flagging** (canceled orders, rapid-order bursts, an EU shipping destination, and high-value orders).
- `Dockerfile` — MySQL image with `init.sql` baked in.

## Notes

- The application connects as a limited user (e.g. `mocktenusr` / read-mostly `mocktenro`); privileged seed/DDL runs only via `init.sql` at init time. To change seed data, edit `init.sql` and rebuild — direct inserts as the app user are denied by design.

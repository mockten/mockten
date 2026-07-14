# sale

Orders / sales service (Go, Gin).

`sale` records orders and powers two consumers: the **Seller Portal** (a seller's own orders, products, and store profile) and the **Admin Portal** (flagged-order monitoring, the platform audit log, and system health). It reads from and writes to MySQL and authenticates callers by their Keycloak JWT.

## Layout

```
sale/
├── server.go        # entrypoint, routing, all handlers (seller + admin), flagging logic
├── server_test.go   # unit tests (max1 helper, EU-country map)
├── go.mod / go.sum
└── Dockerfile
```

The service listens on `:8080`. All logic lives in `server.go`.

## Endpoints (internal `/v1`, exposed via Kong as `/api/*`)

### Seller Portal
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/seller/stats` | Revenue / orders / units / customers with month-over-month change. |
| GET | `/v1/seller/orders` | Paginated orders containing the seller's products (status/search/sort). |
| GET | `/v1/seller/products` | Paginated products with computed status labels. |
| POST/PUT/DELETE | `/v1/seller/products*` | Create / update / delete products, toggle status, manage images. |
| GET/PUT | `/v1/seller/profile` | Store name + "About the Vendor" description. |
| GET | `/v1/seller/categories` | Category list for the product form. |

### Admin Portal
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/orders` | *Flagged* orders only, with a derived reason (see below), paginated. |
| GET | `/v1/admin/audit` | Platform audit log (`AuditLog` table), newest first, paginated. |
| POST | `/v1/admin/audit` | Append an audit entry (`action` required; actor from JWT). |
| GET | `/v1/admin/health` | Component health + colloquial alerts + metrics from live DB state. |

## Order flagging

`handleAdminOrders` scans recent orders and flags each with the first matching reason:

| Reason | Condition |
|--------|-----------|
| Failed / canceled | status is canceled / refunded / failed |
| Unusual location | shipping destination is an EU country (via the `Geo` table; see `euCountries`) |
| Multiple rapid orders | ≥ 3 orders by the same user within 15 minutes |
| High value | order amount ≥ $200 |

## Running tests

```sh
cd sale
go test ./...
```

Unit tests cover the `max1` helper and the `euCountries` classification map used for flagging. These run automatically in CI (`build_sale`).

## Related

- Order / audit tables and demo seed data live in [`mysql`](../mysql).
- The Admin Portal UI lives in [`ecfront2/src/pages/admin`](../ecfront2); these endpoints are also documented in the Developer Dashboard's API Specifications panel.

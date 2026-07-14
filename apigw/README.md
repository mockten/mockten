# apigw

API gateway for mockten, built on [Kong](https://konghq.com/).

`apigw` is the single public entry point in front of every backend service. It terminates client requests from the storefront and the Seller/Admin portals and routes them to the appropriate microservice (`product`, `cart`, `sale`, `ecpay`, `searchitem`, `uam`, `recommendation`, …).

## Layout

```
apigw/
├── kong.yaml     # declarative Kong config: services, routes, plugins (/api/* → internal services)
└── Dockerfile    # Kong image bundled with kong.yaml
```

## Responsibilities

- **Routing** — path-based routing from each public `/api/*` path to an internal service URL (e.g. `sale-service…:8080/v1/admin/orders`).
- **Authentication passthrough** — forwards the caller's `Authorization` bearer token (issued by `uam`/Keycloak) to the downstream service via the `request-transformer` plugin; several UAM routes rewrite the URI to Keycloak's Admin REST API.
- **Cross-cutting concerns** — CORS for browser-based portals, and request/response shaping.

## Public API surface

Every route below is declared in `kong.yaml`. This is the same catalog rendered — with per-endpoint Description (EN/JA/ZH), Input Schema (including which parameters are Mandatory), Response Schema, and a runnable **Test Request** form — in the Developer Dashboard's **API Specifications** panel (`http://localhost/dashboard`). The Dashboard builds that view by parsing this file live, so keeping `kong.yaml` correct keeps the spec correct.

### Auth / UAM (Keycloak)
| Method(s) | Path | Backend |
|-----------|------|---------|
| POST | `/api/uam/token` | Keycloak token (password grant) |
| POST | `/api/uam/creation/token` | Keycloak admin token (superadmin) |
| GET | `/api/uam/userinfo` | Keycloak userinfo |
| GET | `/api/uam/auth` | Keycloak authorization (SSO entry) |
| GET, POST | `/api/uam/broker/google/endpoint` | Google SSO broker callback |
| GET, POST | `/api/uam/users` | List / create Keycloak users |
| GET, PUT, DELETE | `/api/uam/users/:id` | Fetch / update / delete a single user |
| PUT | `/api/uam/users/:id/execute-actions-email` | Send Keycloak action email |
| GET | `/api/uam/roles` | List realm roles |

### Storefront
| Method(s) | Path | Backend |
|-----------|------|---------|
| GET | `/api/search`, `/api/categories` | searchitem |
| GET, POST | `/api/item/detail`, `/api/item/reviews`, `/api/item/review` | product |
| GET, POST, DELETE | `/api/fav`, `/api/fav/:id` | product (wishlist) |
| GET, POST, PUT, DELETE | `/api/cart`, `/api/cart/items`, `/api/cart/items/:id` | cart |
| GET, POST, PUT | `/api/profile`, `/api/geo`, `/api/shipping` | geocoding |
| GET, POST, PUT, DELETE | `/api/payment`, `/api/payment-method` | ecpay |
| GET, POST | `/api/ranking` | ranking (POST → `/api/ranking/update`, increments a product's score) |
| GET, POST | `/api/shipment` | shipment |
| GET | `/api/sale` | sale |
| GET | `/api/recommendation`, `/api/recommendation/similar`, `/api/recommendation/also-bought`, `/api/co-purchase`, `/api/recommendation/model/status` | recommendation |
| POST | `/api/recommendation/train` | recommendation |
| POST, GET | `/api/browsing-history/:id`, `/api/browsing-history/recommendations` | product |
| GET | `/api/storage` | MinIO proxy |
| GET | `/api/stats` | dashboard |

### Seller Portal
| Method(s) | Path | Backend |
|-----------|------|---------|
| GET | `/api/seller/stats`, `/api/seller/orders`, `/api/seller/products`, `/api/seller/categories` | sale |
| POST | `/api/seller/products/create` | sale |
| PUT, DELETE | `/api/seller/products/:id`, `/api/seller/products/:id/status` | sale |
| POST, DELETE | `/api/seller/products/:id/images`, `/api/seller/products/:id/images/:slot` | sale (MinIO) |
| GET, PUT | `/api/seller/profile` | sale |

### Admin Portal
| Method(s) | Path | Backend |
|-----------|------|---------|
| GET | `/api/admin/orders` | sale (flagged orders) |
| GET, POST | `/api/admin/audit` | sale (read / append the audit log) |
| GET | `/api/admin/health` | sale (system health) |
| GET, PUT | `/api/admin/seller` | sale (read / update a seller's store name) |

## Editing routes

Routes are declarative. Add or change a service/route in `kong.yaml`, then rebuild and redeploy the gateway (`task setup && task build`). Every `/api/*` path used by the frontend must have a matching route here, or requests will 404 at the gateway — and it will automatically surface in the Dashboard's API Specifications panel.

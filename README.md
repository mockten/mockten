# mockten
![snapshot workflow](https://github.com/mockten/mockten/actions/workflows/ci.yml/badge.svg)

**mockten** is a full-featured, microservice-based e-commerce platform built for learning and demonstration. It reproduces the core mechanics of a real online store — product search, catalog browsing, a shopping cart, checkout and payment, order/sales tracking, shipping, rankings, and personalized recommendations — behind an API gateway with centralized authentication, and ships with a developer operations dashboard, a Seller Portal, and an Admin Portal.

It is designed to run comfortably within the free tier of public clouds (GCP / AWS / Azure) and locally with Docker, so you can explore how the pieces of an e-commerce system fit together without incurring cost.

## Platform surfaces

mockten exposes four distinct web surfaces. All run locally behind the same nginx entry point once you run `task build`:

| Surface | URL | Who it's for |
|---------|-----|--------------|
| **Mockten storefront** | `http://localhost/` | Buyers — browse, search, cart, checkout |
| **Developer Dashboard** | `http://localhost/dashboard` | Operators/developers — monitoring & ops |
| **Seller Portal** | `http://localhost/seller/login` | Sellers — manage a store |
| **Admin Portal** | `http://localhost/admin` | Administrators — platform governance |

---

### 🛒 Mockten storefront — `http://localhost/`

The buyer-facing shop. Sign in at `/user/login` (or via Google/Facebook SSO — see [Authentication](#google-authentication-setup)).

- Full-text product search (MeiliSearch) with category, price, rating, and stock filters.
- Product detail pages with images (MinIO), reviews, average rating, and "About the vendor" store info.
- Wishlist, shopping cart (Redis-backed), and checkout with Stripe-tokenized payment.
- **Orders are created on purchase** and linked to shipment transactions; the customer-facing Purchase ID equals the seller-visible `order_id`.
- Personalized recommendations: "Top Picks For You", "Based on Browsing History", and "Frequently Bought Together" (see the Recommendation Engine below).

<img width="1440" alt="Mockten storefront" src="https://github.com/user-attachments/assets/2bbd4a97-a5c7-47cf-99f2-168162273272" />

---

### 📊 Developer Dashboard — `http://localhost/dashboard`

A real-time internal portal for monitoring and operating the platform.

| Panel | Description |
|-------|-------------|
| **Dashboard** | Running containers, CPU/memory charts, Kong API telemetry, MySQL/Redis stats, top & slowest endpoints. |
| **Container List** | All Docker containers with status/uptime/resources; start/stop/restart controls. |
| **Log Viewer** | Live container logs with filtering and search. |
| **DB Viewer** | Browse MySQL tables with row-level CRUD. |
| **Topology** | Visual graph of the microservice architecture and data flow. |
| **API Specifications** | Every Kong route rendered with Description (EN/JA/ZH), Input Schema (with Mandatory flags), Response Schema, and a working **Test Request** backdoor form. |
| **Access Management** | Keycloak realm config: clients, roles, identity providers. |
| **Model Performance** | Recommendation model metadata and metrics (Precision@K, Recall@K, NDCG, AUC, MRR, Hit Rate, Coverage). |
| **Local CI Pipelines** | Runs the GitHub Actions CI workflow locally via `act`, streaming per-job status. |
| **E2E Test Runner** | Triggers Playwright e2e/integration suites from the browser. |
| **Data Pipeline** | Triggers and monitors the Airflow ETL DAG. |
| **Security Scanning** | Runs Trivy/ZAP scans (`task infosec`) and displays findings by severity. |

<img width="2406" alt="Developer Dashboard" src="https://github.com/user-attachments/assets/bc28f402-395b-46cf-a57d-315e38f34005" />

---

### 🏪 Seller Portal — `http://localhost/seller/login`

Where sellers manage their store, all backed by live data.

- **Auth**: sign-up creates a Keycloak user in the **Seller** group (store name & phone saved as attributes); sign-in verifies the `seller` role. New sellers start **pending** until an administrator approves them.
- **Overview**: Total Revenue / Orders / Products Sold / Customers cards with month-over-month change, plus a Recent Orders table.
- **Products**: paginated list with status labels (active / low stock / out of stock / inactive), Add/Edit product with up to 3 MinIO images per product, and activate/deactivate (deactivation removes the product from search).
- **Orders**: orders containing the seller's products, with status derived from the shipment leg, status tabs, date sort, and search.
- **Settings**: edit Store Name and the "About the Vendor" description shown on the storefront.

<img width="2400" alt="Seller Portal overview" src="https://github.com/user-attachments/assets/5cecc765-8379-4eee-91cc-c3e8a57b97a6" />

---

### 🛡️ Admin Portal — `http://localhost/admin`

Platform governance for administrators, backed by live Keycloak and backend data. Sign in with an administrator account (e.g. `superadmin` / `superadmin` in local dev).

- **User Management**: lists all Keycloak users with All / Active / Pending / Suspended filter tabs and pagination; create users (`/admin/user/create`), edit (name, email, enabled state, store name), approve pending sellers, suspend, and delete.
- **Order Monitoring**: shows only *flagged* orders with a derived reason — Failed/canceled, Unusual location (EU destination), Multiple rapid orders (≥3 in 15 min), or High value (≥ $200) — with pagination and an Investigate view.
- **System Health**: live component health (Database, API Server, Catalog/Inventory) and colloquial System Alerts derived from real backend metrics.
- **Activity Logs**: the platform-wide audit trail (logins, order placement, admin actions), paginated.

> _Screenshot: Admin Portal dashboard (add here)._

---

## Architecture

A React frontend and the Seller/Admin portals talk to a **Kong** API gateway, which routes to the backend microservices. **Keycloak** provides authentication and authorization for buyers, sellers, and administrators.

```
                ┌────────────────────────────┐
                │   ecfront2 (React SPA)      │
                │  Storefront · Seller · Admin│
                └──────────────┬─────────────┘
                               │
                        ┌──────▼──────┐
                        │ apigw (Kong)│
                        └──────┬──────┘
        ┌───────────┬─────────┼─────────┬───────────┬────────────┐
        │           │         │         │           │            │
   ┌────▼───┐  ┌────▼───┐ ┌───▼────┐ ┌──▼─────┐ ┌───▼────┐  ┌────▼─────────┐
   │product │  │  cart  │ │  sale  │ │ ecpay  │ │shipment│  │recommendation│
   └────┬───┘  └────┬───┘ └───┬────┘ └────────┘ └────────┘  └──────────────┘
        │           │         │
   ┌────▼───┐  ┌────▼───┐ ┌───▼────┐  ┌──────────┐ ┌──────────┐ ┌──────────┐
   │searchit│  │ ranking│ │geocodin│  │  uam     │ │ sync     │ │ airflow  │
   │  em    │  │        │ │  g     │  │(Keycloak)│ │          │ │(pipeline)│
   └────────┘  └────────┘ └────────┘  └──────────┘ └──────────┘ └──────────┘

  Data & infra:  mysql · redis · meilisearch · minIO · monitoring (Prometheus/Grafana/Loki)
```

### Services

| Module | Language / Tech | Responsibility |
|--------|-----------------|----------------|
| [`ecfront2`](ecfront2) | React + Vite + TypeScript | Storefront SPA plus the Seller and Admin portals |
| [`apigw`](apigw) | Kong | API gateway — routing, auth plugins, rate limiting |
| [`uam`](uam) | Keycloak | User Account Management: buyers, sellers, admins, social login |
| [`product`](product) | Go (Gin) | Product catalog: listing, detail, reviews, wishlist |
| [`searchitem`](searchitem) | Go | Product search backed by Meilisearch |
| [`cart`](cart) | Go + Redis | Shopping cart service |
| [`sale`](sale) | Go | Orders / sales, plus the admin monitoring & audit APIs |
| [`ecpay`](ecpay) | Go (gRPC) | Payment processing (Stripe) |
| [`shipment`](shipment) | Go | Shipment / delivery |
| [`ranking`](ranking) | Go | Product ranking |
| [`recommendation`](recommendation) | Python (FastAPI + LightFM) | Personalized recommendations |
| [`geocoding`](geocoding) | Go | Address geocoding (Nominatim) |
| [`sync`](sync) | Bash / cron | Incremental MySQL → Meilisearch index sync |
| [`airflow`](airflow) | Python (Apache Airflow) | Bronze→Silver→Gold ETL pipeline + model training |
| [`mysql`](mysql) | MySQL | Primary relational datastore + schema/seed |
| [`redis`](redis) | Redis | Cache / cart backing store |
| [`meilisearch`](meilisearch) | Meilisearch | Full-text search engine |
| [`minIO`](minIO) | MinIO | S3-compatible object storage (product images, ML models) |
| [`monitoring`](monitoring) | Prometheus / Grafana / Loki + Node dashboard | Observability stack and the Developer Dashboard |
| [`common`](common) | Go | Shared Go libraries (e.g. JWT auth helpers) |

## Requirements

The versions below are what the project is currently built and tested against (CI + local dev):

| Tool | Version |
|------|---------|
| Go | 1.23+ (CI pins `1.23`; service images build on `golang:1.26`, modules target 1.24–1.25) |
| Node.js | 20+ (Dashboard image uses `node:22`) |
| [act](https://github.com/nektos/act) | 0.2.88 (runs the CI workflow locally) |
| Docker Engine / CLI | 24+ (developed on 29.x); the `docker` CLI drives image builds and `docker compose` |
| Docker Compose | v2 (developed on Compose v2.x, invoked as `docker compose`) |
| [gotask](https://taskfile.dev/#/installation) | latest (the `task` runner drives every workflow) |

## Google Authentication Setup
To use Goole SignUp/SignIn, please create Google auth client like below.
<img width="1594" height="1292" alt="CleanShot 2025-07-22 at 13 16 15@2x" src="https://github.com/user-attachments/assets/0769cb4f-53b3-4558-be68-53ddffb899ce" />
| Setting                   | Value                                                |
|---------------------------|------------------------------------------------------|
| Application type          | Web application                                    |
| Authorized Redirect URIs | `http://localhost/api/uam/broker/google/endpoint`     |

Once you get Client ID/secret, please replace the value in uam/config.json
<img width="1186" height="508" alt="CleanShot 2025-07-22 at 16 42 09@2x" src="https://github.com/user-attachments/assets/cd983364-6a7e-443f-909c-3f29277d6ad9" />


## Facebook Authentication Setup
To use Facebook SignUp/SignIn, please create App in [Facebook Developer](https://developers.facebook.com/apps/)
<img width="2016" height="754" alt="CleanShot 2025-07-22 at 16 38 38@2x" src="https://github.com/user-attachments/assets/b4b95c3b-b75d-4a2e-bf05-464df6c0c09e" />
Once you get App ID/secret, please replace the value in uam/config.json
<img width="1016" height="512" alt="CleanShot 2025-07-22 at 16 41 40@2x" src="https://github.com/user-attachments/assets/892e19be-445d-4752-a5d3-6eb12192278f" />

## Running Locally

To confirm that `gotask` is correctly installed, run the following command:

```sh
task -v
```

1. Build (or rebuild) the container images:

    ```sh
    task setup
    ```

2. Stand up the stack in your local environment:

    ```sh
    task build
    ```

3. Open the storefront at `http://localhost` and explore. The other surfaces are at
   `/dashboard`, `/seller/login`, and `/admin`.

    ![CleanShot 2025-02-14 at 13 23 37@2x](https://github.com/user-attachments/assets/32157356-2d52-4583-90f8-0469ad32765e)

4. To tear everything down (after stopping the React app with `Ctrl + C`):

    ```sh
    task destroy
    ```

## Testing

Unit tests run automatically in CI (`.github/workflows/ci.yml`) on every pull request:

- **Go services** (`ecpay`, `ranking`, `sale`, `shipment`, `searchitem`, `product`, `geocoding`, `cart`) run `go test ./...`.
- **Frontend** (`ecfront2`) runs `npm run test` (Vitest).
- **Recommendation** (`recommendation`) runs `pytest`.

To run the full local end-to-end, integration, and security suite, use the Taskfile targets (see `.clinerules` for the canonical order):

```sh
task ci          # run the CI workflow locally via act
task e2e         # buyer end-to-end scenarios
task e2e_sales   # Seller Portal end-to-end scenarios
task ie2e        # integration end-to-end scenarios
task infosec     # Trivy + OWASP ZAP security scanning
```

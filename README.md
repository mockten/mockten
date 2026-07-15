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
<img width="2006" height="912" alt="SUPER SALE" src="https://github.com/user-attachments/assets/d2766e2c-6f27-430d-9bb0-be5ac9a082dd" />

#### Before you can buy: two prerequisites

Checkout is blocked until the account has both. This mirrors a real store, and the end-to-end tests set both up first.

| Prerequisite | Where | Why |
|---|---|---|
| **Delivery address** | `/user/address` | The `geocoding` service turns the address into lat/lon and a country code. Shipping fees are computed from the great-circle (Haversine) distance to the product's warehouse, so an order cannot be priced without one. |
| **Payment card** | `/user/payment` → *Add new card* | The card is tokenized in the browser by Stripe Elements; mockten only ever stores the Stripe token, brand, last4 and expiry — never the raw number. |

**Stripe is in test mode — use a test card, never a real one:**

| Brand | Number | Expiry / CVC / Postal |
|---|---|---|
| VISA | `4242 4242 4242 4242` | any future expiry, any 3-digit CVC, any postal code |
| Mastercard | `5555 5555 5555 4444` | same |
| Amex | `3782 822463 10005` | 4-digit CVC |

No real money moves. (The Developer Dashboard's API test forms use Stripe's ready-made ids `pm_card_visa` / `pm_card_mastercard` for the same reason.)

#### Browsing and buying

1. **Search** (`/search`) — full-text over MeiliSearch, filterable by category, price range, minimum rating, stock and condition (new/used).
2. **Product detail** (`/item/:id`) — images from MinIO, customer reviews and average rating, *About the vendor* (the seller's store description), plus "similar items" and "frequently bought together".
3. **Wishlist** (`/fav/list`) — *Toggle Favorite* on any product; you can **Buy Now** straight from the wishlist.
4. **Cart** (`/cart/list`) — Redis-backed, so it survives sign-out. Choose the shipping leg per item.
5. **Checkout** (`/cart/checkout` → `/cart/confirm`) — shows the saved card (`•••• 4242`) and address, and the shipping fee. Domestic orders are priced by distance; international routes offer **air / sea × standard / express**, each with its own fee and ETA in days.
6. **Place Order** — Stripe creates a PaymentIntent, an `Order` row is written, and shipment transactions are created. The **Purchase ID shown to the buyer is the `order_id`** the seller sees in their portal.
7. **Order history** (`/order-history`) — every purchase with its live shipment status.
8. **Review** (`/item/:id/review`) — after buying, leave a rating; the product's average rating is recalculated atomically.

#### Shipping lifecycle (and why it finishes instantly here)

A background worker in the `shipment` service advances each shipment `preparing → in_transit → delivered` on a tick (`TICK_INTERVAL_SECONDS`, default 200s).

- **`TEST_MODE=true`** (how this repo runs locally): any `scheduled_start` is ignored, so the worker picks the shipment up on the very next tick and the delivery completes almost immediately — handy for demos and E2E.
- **`TEST_MODE` unset**: you can pass a `scheduled_start` (`YYYY-MM-DD HH:MM:SS`) and the delivery only *begins* on that date, behaving like a real scheduled dispatch.

#### Personalization

"Top Picks For You" (LightFM collaborative filtering), "Based on Browsing History", and "Frequently Bought Together" (co-purchase SQL). Best-seller **rankings** update in real time on every purchase. See the Recommendation Engine section below.

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
- **Order Monitoring**: shows only *flagged* orders with a derived reason — Failed/canceled, Unusual location (EU destination), Multiple rapid orders (≥3 in 15 min), or High value (a statistical outlier: above this store's mean + 3σ) — with pagination and an Investigate view.
- **System Health**: live component health (Database, API Server, Catalog/Inventory) and colloquial System Alerts derived from real backend metrics.
- **Activity Logs**: the platform-wide audit trail (logins, order placement, admin actions), paginated.

<img width="2308" height="1156" alt="CleanShot 2026-07-15 at 23 33 54@2x" src="https://github.com/user-attachments/assets/cdabae6a-223e-4c8c-98fe-2837c37bd92f" />


---

## Architecture
<img width="2022" height="1200" alt="CleanShot 2026-06-25 at 11 38 50@2x" src="https://github.com/user-attachments/assets/bcc309dd-e565-4df1-9185-8820a4a88516" />

### Services

| Module | Language / Tech | Responsibility |
|--------|-----------------|----------------|
| [`ecfront`](ecfront) | React + Vite + TypeScript | Storefront SPA plus the Seller and Admin portals |
| [`apigw`](apigw) | Kong | API gateway — routing, auth plugins, rate limiting |
| [`uam`](uam) | Keycloak | User Account Management: buyers, sellers, admins, social login |
| [`product`](product) | Go (Gin) | Product catalog: listing, detail, reviews, wishlist |
| [`searchitem`](searchitem) | Go | Product search backed by Meilisearch |
| [`cart`](cart) | Go + Redis | Shopping cart service |
| [`sale`](sale) | Go | Orders / sales, plus the admin monitoring & audit APIs |
| [`ecpay`](ecpay) | Go (Gin) | Payment processing (Stripe) |
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
| [Go](https://go.dev/dl/) | 1.23+ (CI pins `1.23`; service images build on `golang:1.26`, modules target 1.24–1.25) |
| [Node.js](https://nodejs.org/en/download) | 20+ (Dashboard image uses `node:22`) |
| [act](https://github.com/nektos/act) | 0.2.88 (runs the CI workflow locally) |
| [Docker Engine / CLI](https://docs.docker.com/engine/install/) | 24+ (developed on 29.x); the `docker` CLI drives image builds and `docker compose` |
| [Docker Compose](https://docs.docker.com/compose/install/) | v2 (developed on Compose v2.x, invoked as `docker compose`) |
| [gotask](https://taskfile.dev/#/installation) | latest (the `task` runner drives every workflow) |

## Google Authentication Setup
To enable Google sign-up / sign-in, create an OAuth 2.0 Web application client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) as shown below.
<img width="1594" height="1292" alt="CleanShot 2025-07-22 at 13 16 15@2x" src="https://github.com/user-attachments/assets/0769cb4f-53b3-4558-be68-53ddffb899ce" />
| Setting                   | Value                                                |
|---------------------------|------------------------------------------------------|
| Application type          | Web application                                    |
| Authorized Redirect URIs | `http://localhost/api/uam/broker/google/endpoint`     |

Once the client is created, copy its Client ID and Client Secret into `uam/uam.env` (copy `uam/uam.env.example` to create it).
<img width="1186" height="508" alt="CleanShot 2025-07-22 at 16 42 09@2x" src="https://github.com/user-attachments/assets/cd983364-6a7e-443f-909c-3f29277d6ad9" />


## Facebook Authentication Setup
To enable Facebook sign-up / sign-in, create an app in [Facebook Developers](https://developers.facebook.com/apps/).
<img width="2016" height="754" alt="CleanShot 2025-07-22 at 16 38 38@2x" src="https://github.com/user-attachments/assets/b4b95c3b-b75d-4a2e-bf05-464df6c0c09e" />
Once the app is created, copy its App ID and App Secret into `uam/uam.env` (copy `uam/uam.env.example` to create it).
<img width="1016" height="512" alt="CleanShot 2025-07-22 at 16 41 40@2x" src="https://github.com/user-attachments/assets/892e19be-445d-4752-a5d3-6eb12192278f" />


## Payment (Stripe) Setup
Card payments are processed with [Stripe](https://stripe.com/). Create a free Stripe account, and while the dashboard is in **Test mode** open **Developers → API keys** to find your **Publishable key** (`pk_test_…`) and **Secret key** (`sk_test_…`).


<img width="1642" height="736" alt="CleanShot 2026-07-15 at 23 35 02@2x" src="https://github.com/user-attachments/assets/d458bd0d-8046-4427-a2ae-440ad1acb9ce" />


Copy each key into the matching environment file:

| Key | Where to put it | Variable |
|-----|-----------------|----------|
| Publishable key (`pk_test_…`) | `ecfront/.env` | `VITE_STRIPE_PUBLIC_KEY` |
| Secret key (`sk_test_…`) | `.env` (repository root) | `STRIPE_SECRET_KEY` |

Both files are gitignored, so your keys stay local and are never committed. Use the test keys for development — payments then run against Stripe's test environment, where cards such as `4242 4242 4242 4242` (any future expiry and CVC) succeed without charging real money.

## Running Locally

First, verify that `gotask` is installed:

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

3. Open the storefront at `http://localhost/user/login` and explore. The other surfaces are at
   `/dashboard`, `/seller/login`, and `/admin/login`.
- **/user/login**:
  <img width="1344" height="1412" alt="CleanShot 2026-07-15 at 01 03 30@2x" src="https://github.com/user-attachments/assets/e2f004c4-aedb-4bde-9213-9bbda96eabba" />
- **/dashboard**:
<img width="2542" height="1486" alt="CleanShot 2026-07-15 at 01 43 11@2x" src="https://github.com/user-attachments/assets/4a10dc35-9b57-40f4-a51d-14de32ee6efb" />

- **/seller/login**:
  
<img width="1232" height="1270" alt="CleanShot 2026-07-15 at 01 04 43@2x" src="https://github.com/user-attachments/assets/172280c5-2a26-4262-9240-90f89e91c9cc" />

- **/admin/login**:
    <img width="1006" height="1220" alt="CleanShot 2026-07-15 at 01 04 59@2x" src="https://github.com/user-attachments/assets/f7ebbf69-2199-4c2a-9b82-fef818d46967" />


4. To tear everything down (after stopping the React app with `Ctrl + C`):

    ```sh
    task destroy
    ```

## Testing

Unit tests run automatically in CI (`.github/workflows/ci.yml`) on every pull request:

- **Go services** (`ecpay`, `ranking`, `sale`, `shipment`, `searchitem`, `product`, `geocoding`, `cart`) run `go test ./...`.
- **Frontend** (`ecfront`) runs `npm run test` (Vitest).
- **Recommendation** (`recommendation`) runs `pytest`.

To run the full local end-to-end, integration, and security suite, use the Taskfile targets (see `.clinerules` for the canonical order):

```sh
task ci          # run the CI workflow locally via act
task e2e         # buyer end-to-end scenarios
task e2e_sales   # Seller Portal end-to-end scenarios
task ie2e        # integration end-to-end scenarios
task infosec     # Trivy + OWASP ZAP security scanning
```

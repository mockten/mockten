# mockten
![snapshot workflow](https://github.com/mockten/mockten/actions/workflows/ci.yml/badge.svg)

**mockten** is a full-featured, microservice-based e-commerce platform built for learning and demonstration. It reproduces the core mechanics of a real online store — product search, catalog browsing, a shopping cart, checkout and payment, order/sales tracking, shipping, rankings, and personalized recommendations — behind an API gateway with centralized authentication.

It is designed to run comfortably within the free tier of public clouds (GCP / AWS / Azure) and locally on Kubernetes, so you can explore how the pieces of an e-commerce system fit together without incurring cost.

## Architecture

mockten is composed of independently deployable services. A React storefront and the Seller/Admin portals talk to a **Kong** API gateway, which routes to the backend services. **Keycloak** provides authentication and authorization for buyers, sellers, and administrators.

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
| [`product`](product) | Go (Gin) | Product catalog: listing, detail, seller product management |
| [`searchitem`](searchitem) | Go | Product search backed by Meilisearch |
| [`cart`](cart) | Go + Redis | Shopping cart service |
| [`sale`](sale) | Go | Orders / sales, plus the admin monitoring & audit APIs |
| [`ecpay`](ecpay) | Go (gRPC) | Payment processing |
| [`shipment`](shipment) | Go | Shipment / delivery |
| [`ranking`](ranking) | Go (gRPC) | Product ranking |
| [`recommendation`](recommendation) | Python (FastAPI + LightFM) | Personalized recommendations |
| [`geocoding`](geocoding) | Go | Address geocoding (Nominatim) |
| [`sync`](sync) | Bash / cron | Incremental MySQL → Meilisearch index sync |
| [`airflow`](airflow) | Python (Apache Airflow) | Bronze→Silver→Gold data pipeline + model training |
| [`mysql`](mysql) | MySQL | Primary relational datastore + schema/seed |
| [`redis`](redis) | Redis | Cache / cart backing store |
| [`meilisearch`](meilisearch) | Meilisearch | Full-text search engine |
| [`minIO`](minIO) | MinIO | S3-compatible object storage (product images, ML models) |
| [`monitoring`](monitoring) | Prometheus / Grafana / Loki + Node dashboard | Observability stack and operations dashboard |
| [`common`](common) | Go | Shared Go libraries (e.g. JWT auth helpers) |

## Requirement
- Go version
```
go1.21.4
```
- Nodejs version
```
node: '20.9.0'
```

- act version
```
act version 0.2.88
```

# Building Dev Infrastructure
Before proceeding, ensure you have the following tool installed on your system:

- [gotask](https://taskfile.dev/#/installation)

## Google Authentication Setup
To use Goole SignUp/SignIn, please create Google auth client like below.
<img width="1594" height="1292" alt="CleanShot 2025-07-22 at 13 16 15@2x" src="https://github.com/user-attachments/assets/0769cb4f-53b3-4558-be68-53ddffb899ce" />
| Setting                   | Value                                                |
|---------------------------|------------------------------------------------------|
| Application type          | Web application                                    |
| Authorized Redirect URIs | http://localhost/api/uam/broker/google/endpoint     |

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

2. Stand up the Kubernetes stack in your local environment:

    ```sh
    task build
    ```

3. Open the storefront at http://localhost and explore.

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

To run the full local end-to-end and integration suite, use the Taskfile targets (see `.clinerules` for the canonical order):

```sh
task ci          # run the CI workflow locally via act
task e2e         # end-to-end scenarios
task infosec     # Trivy image scanning
```

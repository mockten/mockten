# apigw

API gateway for mockten, built on [Kong](https://konghq.com/).

`apigw` is the single public entry point in front of every backend service. It terminates client requests from the storefront and the Seller/Admin portals and routes them to the appropriate microservice (`product`, `cart`, `sale`, `ecpay`, `searchitem`, `uam`, `recommendation`, …).

## Contents

- `kong.yaml` — declarative Kong configuration: the services, routes, and plugins that map public `/api/*` paths to internal Kubernetes services.
- `Dockerfile` — builds the Kong image bundled with `kong.yaml`.

## Responsibilities

- **Routing** — path-based routing to each backend service.
- **Authentication** — forwards bearer tokens issued by `uam` (Keycloak) to downstream services.
- **Cross-cutting concerns** — CORS, rate limiting, and request/response shaping.

## Editing routes

Routes are declarative. Add or change a service/route in `kong.yaml`, then rebuild and redeploy the gateway (`task setup && task build`). Each admin/API path used by the frontend must have a matching route here, or requests will 404 at the gateway.

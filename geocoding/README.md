# geocoding

Address geocoding & delivery-profile service (Go, net/http).

`geocoding` resolves user/shipping addresses into structured geographic data (including country code and lat/lon) using a [Nominatim](https://nominatim.org/) backend, stores each user's delivery profile, and computes shipping fees by distance. The country codes it produces are used elsewhere — for example, [`sale`](../sale) uses the destination country to flag orders shipping to the EU.

## Layout

```
geocoding/
├── main.go        # entrypoint, HTTP handlers, Nominatim query building, JWT verification
├── main_test.go   # unit tests (UUID generation)
├── config.json    # service configuration
├── go.mod / go.sum
└── Dockerfile
```

The service listens on `:8080`.

## Endpoints (exposed via Kong as `/api/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/profile` | Read, or geocode and save, the user's delivery address profile. |
| GET | `/shipping` | Compute the shipping fee between the user's address and the product's warehouse. |
| GET | `/geo` | Return saved geocoded address records for a user. |

## Key functions

- `buildParams(req GeocodeRequest)` — builds the Nominatim query parameters from an address request (country, state/prefecture, city, town/street).
- `generateUUID` — generates identifiers for geocoding records.

## Configuration

| Env var | Purpose |
|---------|---------|
| `KEYCLOAK_JWKS_URL` | Explicit JWKS URL (otherwise derived from the two below). |
| `KEYCLOAK_BASE_URL` / `KEYCLOAK_REALM` | Used to build the JWKS URL for JWT verification. |

## Running tests

```sh
cd geocoding
GOWORK=off go test ./...
```

Unit tests cover `generateUUID`. Tests run automatically in CI (`build_geocoding` job). The module is built with `GOWORK=off` so it resolves its own dependencies independently of the workspace.

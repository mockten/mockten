# searchitem

Product search service (Go, Gin) backed by Meilisearch.

`searchitem` powers the storefront's search bar. It builds filtered Meilisearch queries (keyword, pagination, category, on-sale / sold-out status, in-stock flag, price range, minimum rating), hydrates results with product metadata from MySQL, and serves the category list used by the filter dropdown. The Meilisearch index it queries is kept in sync from MySQL by the [`sync`](../sync) job.

## Layout

```
searchitem/
├── search.go        # entrypoint, search + category handlers, response mapping
├── search_test.go   # unit tests (ProductDetail → response mapping)
├── go.mod / go.sum
└── Dockerfile
```

The service listens on the configured HTTP port and exposes Prometheus metrics on `:9100`.

## Endpoints (internal `/v1`, exposed via Kong as `/api/*`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/search` | Full-text product search with keyword, pagination, category, status, in-stock, price-range, and min-rating filters. |
| GET | `/v1/categories` | The complete list of product categories (for the search bar dropdown). |

## Key functions

- `searchHandler` — parses query parameters, builds the Meilisearch query, and returns matched products.
- `getCategoryListHandler` — returns all categories from MySQL.
- `ConvertToResponse` — maps an internal `ProductDetail` into the outward `ProductDetailResponse` shape.

## Running tests

```sh
cd searchitem
go test ./...
```

Unit tests cover `ConvertToResponse`. Tests run automatically in CI (`build_searchitem` job).

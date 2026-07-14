# meilisearch

Full-text search engine ([Meilisearch](https://www.meilisearch.com/)).

`meilisearch` powers product search for the storefront. The [`searchitem`](../searchitem) service queries it, and the [`sync`](../sync) job keeps its product index up to date from [`mysql`](../mysql).

## Contents

- `Dockerfile` — Meilisearch image with mockten configuration.

## Usage

- Reached in-cluster at `meilisearch-service.default.svc.cluster.local:7700`.
- The product index is populated and incrementally updated by `sync`; it is not the source of truth (MySQL is).

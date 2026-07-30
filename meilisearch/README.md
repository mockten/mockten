# meilisearch

Full-text search engine ([Meilisearch](https://www.meilisearch.com/)).

`meilisearch` powers product search for the storefront. The [`searchitem`](../searchitem) service queries it (keyword, category, status, price, rating, stock filters), and the [`sync`](../sync) job keeps its product index up to date from [`mysql`](../mysql).

## Layout

```
meilisearch/
├── init.sh         # creates the index, configures searchable/filterable attributes
├── load_mysql.sh   # initial bulk load of products from MySQL into the index
└── Dockerfile      # Meilisearch image with mockten configuration
```

## How it fits together

```
MySQL ──(initial load: load_mysql.sh)──▶ Meilisearch index ◀──(incremental deltas: sync)── MySQL
                                              ▲
                                              │ queries
                                        searchitem
```

- `init.sh` sets up the index schema (which attributes are searchable and filterable).
- `load_mysql.sh` performs the first full population.
- Ongoing updates (new/changed/deactivated products) are applied incrementally by [`sync`](../sync).

## Usage

- Reached in-cluster at `meilisearch-service.default.svc.cluster.local:7700`.
- The index is a search projection, **not** the source of truth — MySQL is.

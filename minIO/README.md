# minIO

S3-compatible object storage ([MinIO](https://min.io/)).

`minIO` stores the platform's binary assets and the ML lakehouse data.

## Layout

```
minIO/
├── init.sh    # creates buckets and sets access policies at startup
├── photos/    # local seed product images (gitignored contents)
└── Dockerfile # MinIO image with mockten bucket configuration
```

## What's stored

| Asset | Location | Producer → Consumer |
|-------|----------|---------------------|
| Product images | `photos/<product_id>.png` (+ `<product_id>/1.png`, `/2.png`) | Sellers upload via [`sale`](../sale) → storefront serves via `/api/storage/*` |
| Category placeholders | `photos/category_<category_id>.png` | fallback images for recommendations |
| ETL data | `mockten-bronze` / `mockten-silver` / `mockten-gold` buckets (Parquet) | [`airflow`](../airflow) pipeline stages |
| ML model | `models/` bucket (`svd_model.pkl`, `metrics.json`) | [`airflow`](../airflow) trains → [`recommendation`](../recommendation) hot-reloads |

## Usage

- `init.sh` creates the buckets and applies access policies when the container starts.
- Reached in-cluster at `minio-service.default.svc.cluster.local:9000`; the storefront reaches product images through the Kong `/api/storage` proxy so MinIO credentials are never exposed to the browser.

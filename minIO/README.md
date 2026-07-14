# minIO

S3-compatible object storage ([MinIO](https://min.io/)).

`minIO` stores the platform's binary assets:

- **Product images** — uploaded by sellers and served to the storefront (via the `/api/storage/*` paths).
- **ML model artifacts** — the trained recommendation model published by the [`airflow`](../airflow) pipeline and loaded by [`recommendation`](../recommendation).

## Contents

- `Dockerfile` — MinIO image with mockten bucket configuration.

## Usage

- Reached in-cluster at `minio-service.default.svc.cluster.local:9000`.
- Product images are stored as `<product_id>.png`; category placeholders as `category_<category_id>.png`.

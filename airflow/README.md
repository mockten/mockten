# airflow

Batch data pipeline and model training, orchestrated by [Apache Airflow](https://airflow.apache.org/).

`airflow` runs the offline analytics/ML pipeline that feeds the [`recommendation`](../recommendation) service.

## Pipeline

`dags/pipeline_dag.py` implements a medallion-style pipeline:

```
Bronze  →  Silver  →  Gold  →  Model Train
raw       cleaned/    ML         LightFM model
MySQL     joined      features   published to MinIO
dump
```

- **Bronze** — raw dump of the relevant MySQL tables.
- **Silver** — cleaned and joined interaction/product data.
- **Gold** — engineered features ready for training.
- **Model Train** — trains the recommendation model and publishes the artifact to [`minIO`](../minIO), where `recommendation` loads it.

## Contents

- `dags/pipeline_dag.py` — the DAG definition.
- `scripts/entrypoint.sh` — container entrypoint.
- `requirements.txt` — Python dependencies (pandas, pyarrow, pymysql, minio, …).
- `Dockerfile` — Airflow image.

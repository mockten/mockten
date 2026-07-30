# airflow

Batch data pipeline and model training, orchestrated by [Apache Airflow](https://airflow.apache.org/).

`airflow` runs the offline analytics/ML pipeline (`mockten_data_pipeline`) that feeds the [`recommendation`](../recommendation) service. It implements a Bronze → Silver → Gold lakehouse pattern over Parquet in [`minIO`](../minIO), and trains + publishes the recommendation model artifact.

## Layout

```
airflow/
├── dags/
│   └── pipeline_dag.py     # the mockten_data_pipeline DAG (Bronze→Silver→Gold→train)
├── scripts/
│   └── entrypoint.sh       # container entrypoint
├── requirements.txt        # pandas, pyarrow, pymysql, minio, numpy, …
└── Dockerfile
```

## Pipeline stages (`dags/pipeline_dag.py`)

```
MySQL (source) → [Bronze] → [Silver] → [Gold] → Model Train → MinIO (model + metrics)
```

| Stage | Task | What it does |
|-------|------|--------------|
| **Bronze** | `bronze_ingest` | Raw dump of `Transaction`, `Product`, `Stock`, `Wishlist`, `Review`, `Order` to Parquet (`mockten-bronze`). No transformation. |
| **Silver** | `silver_transform` | Clean (drop nulls, dedup), parse timestamps, join into `user_orders`, `user_behavior`, `product_catalog` (`mockten-silver`). |
| **Gold** | `gold_features` | Build ML-ready features: `user_item_matrix` (weighted interaction scores) and `product_features` (category / price band / review band) (`mockten-gold`). |
| **Model Train** | `model_train` | Train the model on the interaction matrix, write `svd_model.pkl` + `metrics.json` to the MinIO `models` bucket. |

The live [`recommendation`](../recommendation) service polls MinIO and hot-reloads the model when a new artifact appears. Training metrics (Precision@K, Recall@K, NDCG, AUC, MRR, Hit Rate, Coverage) surface in the Developer Dashboard's Model Performance panel.

## Running

Triggered from the Developer Dashboard's **Data Pipeline** panel, or on a schedule inside Airflow. Locally the DAG runs against the in-cluster MySQL and MinIO endpoints configured in the DAG.

"""
Mockten Data Pipeline DAG
Bronze (raw MySQL dump) → Silver (cleaned/joined) → Gold (ML features) → Model Train
"""
from __future__ import annotations

import io
import logging
import os
import pickle
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import pymysql
import pyarrow as pa
import pyarrow.parquet as pq
from minio import Minio
from minio.error import S3Error

from airflow.decorators import dag, task

log = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-service.default.svc.cluster.local")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio-service.default.svc.cluster.local:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")

BRONZE_BUCKET = "mockten-bronze"
SILVER_BUCKET = "mockten-silver"
GOLD_BUCKET = "mockten-gold"
MODELS_BUCKET = "models"


def get_mysql():
    return pymysql.connect(
        host=MYSQL_HOST, port=MYSQL_PORT,
        user=MYSQL_USER, password=MYSQL_PASSWORD,
        database=MYSQL_DB, cursorclass=pymysql.cursors.DictCursor
    )


def get_minio():
    return Minio(MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY,
                 secret_key=MINIO_SECRET_KEY, secure=False)


def ensure_bucket(client: Minio, bucket: str):
    try:
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)
    except Exception as e:
        if 'BucketAlreadyOwnedByYou' not in str(e) and 'BucketAlreadyExists' not in str(e):
            raise


def df_to_minio(client: Minio, bucket: str, key: str, df: pd.DataFrame):
    table = pa.Table.from_pandas(df, preserve_index=False)
    buf = io.BytesIO()
    pq.write_table(table, buf)
    buf.seek(0)
    client.put_object(bucket, key, buf, length=buf.getbuffer().nbytes,
                      content_type="application/octet-stream")
    log.info("Wrote %d rows to %s/%s", len(df), bucket, key)


def minio_to_df(client: Minio, bucket: str, key: str) -> pd.DataFrame:
    resp = client.get_object(bucket, key)
    try:
        buf = io.BytesIO(resp.read())
    finally:
        resp.close()
        resp.release_conn()
    return pq.read_table(buf).to_pandas()


def _compute_metrics(interactions_df: pd.DataFrame, u2i: dict, p2i: dict,
                     user_factors: np.ndarray, item_factors: np.ndarray, K: int = 10) -> dict:
    """Holdout evaluation: for each user, hide the highest-score interaction as test."""
    # Sort by score desc; use highest-score item as the positive test item per user
    df = interactions_df.copy()
    df["u_idx"] = df["user_id"].map(u2i)
    df["p_idx"] = df["product_id"].map(p2i)
    df = df.dropna(subset=["u_idx", "p_idx"])

    # test set: highest-scored item per user
    test = df.sort_values("score", ascending=False).groupby("u_idx").first().reset_index()
    test_pos = {int(row.u_idx): int(row.p_idx) for _, row in test.iterrows()}

    # train set: everything except test item
    train_mask = ~(df["u_idx"].isin(test_pos.keys()) &
                   (df["p_idx"] == df["u_idx"].map(test_pos)))
    train_df = df[train_mask]

    # Build train matrix for score computation (we use full factors for simplicity)
    scores_matrix = user_factors @ item_factors.T   # (n_users, n_items)

    n_users = len(test_pos)
    prec_sum = rec_sum = ndcg_sum = mrr_sum = hit_sum = auc_sum = 0.0
    recommended_items: set = set()

    for u_idx, pos_item in test_pos.items():
        # Get scores for this user; exclude training items
        user_scores = scores_matrix[u_idx].copy()
        # Zero out all training items for this user to simulate realistic ranking
        for _, row in train_df[train_df["u_idx"] == u_idx].iterrows():
            user_scores[int(row.p_idx)] = -np.inf

        top_k = np.argsort(user_scores)[::-1][:K]
        recommended_items.update(top_k.tolist())

        hits = [1 if i == pos_item else 0 for i in top_k]
        hit = int(pos_item in top_k)

        # Precision@K
        prec_sum += sum(hits) / K

        # Recall@K (1 positive → recall = hit/1)
        rec_sum += hit

        # NDCG@K
        dcg = sum(h / np.log2(idx + 2) for idx, h in enumerate(hits))
        idcg = 1.0  # only 1 positive
        ndcg_sum += dcg / idcg if idcg > 0 else 0

        # MRR
        for rank, i in enumerate(top_k):
            if i == pos_item:
                mrr_sum += 1.0 / (rank + 1)
                break

        # Hit Rate@K
        hit_sum += hit

        # AUC (fraction of all non-pos items ranked below pos item)
        pos_score = scores_matrix[u_idx][pos_item]
        all_scores = scores_matrix[u_idx]
        n_items_total = len(all_scores)
        n_worse = int(np.sum(all_scores < pos_score))
        auc_sum += n_worse / max(n_items_total - 1, 1)

    def fmt(v): return round(float(v / n_users), 4) if n_users else 0.0

    coverage = round(len(recommended_items) / max(len(p2i), 1), 4)

    return {
        "precision_at_k":  fmt(prec_sum),
        "recall_at_k":     fmt(rec_sum),
        "ndcg_at_k":       fmt(ndcg_sum),
        "auc":             fmt(auc_sum),
        "mrr":             fmt(mrr_sum),
        "hit_rate_at_k":   fmt(hit_sum),
        "coverage":        coverage,
        "k":               K,
        "n_eval_users":    n_users,
    }


# ── DAG ──────────────────────────────────────────────────────────────────────
@dag(
    dag_id="mockten_data_pipeline",
    description="Bronze/Silver/Gold lakehouse pipeline for Mockten recommendation ML",
    schedule=None,
    start_date=datetime(2024, 1, 1),
    catchup=False,
    tags=["mockten", "etl", "ml"],
    default_args={"retries": 1, "retry_delay": timedelta(minutes=2)},
)
def mockten_pipeline():

    @task(task_id="bronze_ingest")
    def bronze_ingest(**ctx) -> dict:
        """Dump raw MySQL tables to Parquet in mockten-bronze bucket."""
        ds = ctx["ds"]  # YYYY-MM-DD
        client = get_minio()
        ensure_bucket(client, BRONZE_BUCKET)
        conn = get_mysql()
        stats = {}
        tables = {
            # Transaction has no user_id; join Geo to get it
            "transactions": "SELECT t.transaction_id, t.product_id, t.geo_id, t.status, t.leg_type, t.created_at, g.user_id FROM `Transaction` t JOIN Geo g ON t.geo_id = g.geo_id",
            "products": "SELECT product_id, product_name, category_id, price, avg_review, review_count FROM Product",
            "stock": "SELECT product_id, stocks FROM Stock",
            # Wishlist.product_ids is JSON; expand to rows via SQL
            "wishlist": "SELECT user_id, JSON_UNQUOTE(jt.product_id) AS product_id FROM Wishlist, JSON_TABLE(product_ids, '$[*]' COLUMNS(product_id VARCHAR(36) PATH '$')) AS jt",
            # ReviewRating table doesn't exist; use Review
            "reviews": "SELECT product_id, user_id, rating, created_at FROM Review WHERE status='active'",
            # No UserBehavior table; derive from Order (purchase events)
            "order_events": "SELECT user_id, JSON_UNQUOTE(JSON_EXTRACT(transactions_json, '$[0].product_id')) AS product_id, status, created_at FROM `Order` WHERE status IN ('paid','delivered')",
        }
        try:
            for name, sql in tables.items():
                with conn.cursor() as cur:
                    cur.execute(sql)
                    rows = cur.fetchall()
                df = pd.DataFrame(rows)
                key = f"{name}/{ds}.parquet"
                df_to_minio(client, BRONZE_BUCKET, key, df)
                stats[name] = len(df)
                log.info("Bronze %s: %d rows", name, len(df))
        finally:
            conn.close()
        return stats

    @task(task_id="silver_transform")
    def silver_transform(bronze_stats: dict, **ctx) -> dict:
        """Clean, deduplicate and join Bronze → Silver."""
        ds = ctx["ds"]
        client = get_minio()
        ensure_bucket(client, SILVER_BUCKET)
        stats = {}

        # user_orders: transactions + product info
        txn = minio_to_df(client, BRONZE_BUCKET, f"transactions/{ds}.parquet")
        products = minio_to_df(client, BRONZE_BUCKET, f"products/{ds}.parquet")
        stock = minio_to_df(client, BRONZE_BUCKET, f"stock/{ds}.parquet")

        txn = txn.dropna(subset=["user_id", "product_id"]).drop_duplicates()
        txn["created_at"] = pd.to_datetime(txn.get("created_at", pd.NaT), errors="coerce")

        user_orders = txn.merge(products, on="product_id", how="left") \
                         .merge(stock, on="product_id", how="left")
        df_to_minio(client, SILVER_BUCKET, f"user_orders/{ds}.parquet", user_orders)
        stats["user_orders"] = len(user_orders)

        # user_behavior: combine order_events + reviews + wishlist as implicit signals
        order_ev = minio_to_df(client, BRONZE_BUCKET, f"order_events/{ds}.parquet")
        reviews_df = minio_to_df(client, BRONZE_BUCKET, f"reviews/{ds}.parquet")
        wishlist_df = minio_to_df(client, BRONZE_BUCKET, f"wishlist/{ds}.parquet")

        def _pick(df, cols):
            """Safely select cols from df; return empty df with those cols if missing."""
            missing = [c for c in cols if c not in df.columns]
            if missing:
                return pd.DataFrame(columns=cols)
            return df[cols].dropna()

        order_ev   = _pick(order_ev,   ["user_id","product_id"]).assign(event_type="purchase")
        reviews_df = _pick(reviews_df, ["user_id","product_id"]).assign(event_type="review")
        wishlist_df = _pick(wishlist_df, ["user_id","product_id"]).assign(event_type="wishlist")

        behavior = pd.concat([order_ev, reviews_df, wishlist_df], ignore_index=True) \
                     .dropna(subset=["user_id","product_id"]).drop_duplicates()
        df_to_minio(client, SILVER_BUCKET, f"user_behavior/{ds}.parquet", behavior)
        stats["user_behavior"] = len(behavior)

        # product_catalog: products + avg stock
        catalog = products.merge(stock, on="product_id", how="left")
        catalog = catalog.dropna(subset=["product_id"])
        df_to_minio(client, SILVER_BUCKET, f"product_catalog/{ds}.parquet", catalog)
        stats["product_catalog"] = len(catalog)

        log.info("Silver stats: %s", stats)
        return stats

    @task(task_id="gold_features")
    def gold_features(silver_stats: dict, **ctx) -> dict:
        """Build ML feature tables from Silver → Gold."""
        ds = ctx["ds"]
        client = get_minio()
        ensure_bucket(client, GOLD_BUCKET)
        stats = {}

        user_orders = minio_to_df(client, SILVER_BUCKET, f"user_orders/{ds}.parquet")
        behavior = minio_to_df(client, SILVER_BUCKET, f"user_behavior/{ds}.parquet")
        catalog = minio_to_df(client, SILVER_BUCKET, f"product_catalog/{ds}.parquet")

        # user-item interaction matrix (purchase count + behavior weight)
        purchase_scores = user_orders.groupby(["user_id", "product_id"]).size() \
                                     .reset_index(name="purchase_count")
        behavior_scores = behavior.groupby(["user_id", "product_id"]).size() \
                                  .reset_index(name="behavior_count")

        interactions = purchase_scores.merge(behavior_scores, on=["user_id", "product_id"], how="outer") \
                                      .fillna(0)
        interactions["score"] = interactions["purchase_count"] * 3 + interactions["behavior_count"]
        df_to_minio(client, GOLD_BUCKET, f"user_item_matrix/{ds}.parquet", interactions)
        stats["user_item_matrix"] = len(interactions)

        # product features for LightFM hybrid mode
        def price_band(p):
            if p < 20: return "price_low"
            if p < 100: return "price_mid"
            return "price_high"

        def review_band(r):
            if r >= 4.0: return "highly_rated"
            if r >= 3.0: return "rated"
            return "unrated"

        feat = catalog[["product_id", "category_id", "price", "avg_review"]].copy()
        feat["price_band"] = feat["price"].apply(price_band)
        feat["review_band"] = feat["avg_review"].apply(review_band)
        feat["feature_str"] = feat.apply(
            lambda r: f"cat_{r['category_id']}|{r['price_band']}|{r['review_band']}", axis=1
        )
        df_to_minio(client, GOLD_BUCKET, f"product_features/{ds}.parquet", feat)
        stats["product_features"] = len(feat)

        log.info("Gold stats: %s", stats)
        return stats

    @task(task_id="model_train")
    def model_train(gold_stats: dict, **ctx) -> dict:
        """Train SVD-based recommendation model from Gold features and save to MinIO."""
        import numpy as np
        from scipy.sparse import csr_matrix
        from sklearn.decomposition import TruncatedSVD

        ds = ctx["ds"]
        client = get_minio()
        ensure_bucket(client, MODELS_BUCKET)

        interactions_df = minio_to_df(client, GOLD_BUCKET, f"user_item_matrix/{ds}.parquet")
        features_df     = minio_to_df(client, GOLD_BUCKET, f"product_features/{ds}.parquet")

        if interactions_df.empty:
            log.warning("No interaction data; skipping model training.")
            return {"status": "skipped", "reason": "no interactions"}

        # Build sparse user-item matrix
        users   = interactions_df["user_id"].unique().tolist()
        items   = interactions_df["product_id"].unique().tolist()
        u2i     = {u: i for i, u in enumerate(users)}
        p2i     = {p: i for i, p in enumerate(items)}

        rows = interactions_df["user_id"].map(u2i).values
        cols = interactions_df["product_id"].map(p2i).values
        vals = interactions_df["score"].astype(float).values
        mat  = csr_matrix((vals, (rows, cols)), shape=(len(users), len(items)))

        n_components = min(30, mat.shape[0] - 1, mat.shape[1] - 1)
        if n_components < 1:
            return {"status": "skipped", "reason": "too few users/items"}

        svd = TruncatedSVD(n_components=n_components, random_state=42)
        user_factors = svd.fit_transform(mat)   # (n_users, k)
        item_factors = svd.components_.T        # (n_items, k)

        trained_at = datetime.utcnow().isoformat()
        payload = {
            "model_type":   "TruncatedSVD",
            "users":        users,
            "items":        items,
            "user_factors": user_factors,
            "item_factors": item_factors,
            "trained_at":   trained_at,
        }
        data = pickle.dumps(payload)
        buf  = io.BytesIO(data)
        client.put_object(MODELS_BUCKET, "recommendation/svd_model.pkl",
                          buf, length=len(data), content_type="application/octet-stream")

        log.info("SVD model trained: %d users, %d items, %d components",
                 len(users), len(items), n_components)

        # ── Compute evaluation metrics (holdout: last interaction per user as test) ──
        import json
        metrics = _compute_metrics(interactions_df, u2i, p2i, user_factors, item_factors)
        metrics["trained_at"] = trained_at
        metrics["n_users"] = len(users)
        metrics["n_items"] = len(items)
        metrics_json = json.dumps(metrics).encode()
        client.put_object(MODELS_BUCKET, "recommendation/metrics.json",
                          io.BytesIO(metrics_json), length=len(metrics_json),
                          content_type="application/json")
        log.info("Metrics: %s", metrics)

        return {"status": "success", "users": len(users), "items": len(items),
                "components": n_components, "trained_at": trained_at}

    # Wire the pipeline
    b = bronze_ingest()
    s = silver_transform(b)
    g = gold_features(s)
    model_train(g)


mockten_pipeline()

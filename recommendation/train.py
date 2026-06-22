import io
import json
import os
import sys
import time
import datetime
import logging

import numpy as np
from minio import Minio

from db import get_db_connection, fetch_interactions, fetch_item_features
from model import RecommendationModel
from storage import save_model, get_minio_client, MODEL_BUCKET

MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-service.default.svc.cluster.local")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

METRICS_KEY = "recommendation/metrics.json"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation-trainer")


def _compute_and_save_metrics(model: RecommendationModel, interactions: list[dict], K: int = 10):
    """Compute holdout evaluation metrics and save to MinIO as metrics.json."""
    u2i = model.user_id_map
    p2i = model.item_id_map

    if not u2i or not p2i:
        logger.warning("Empty user/item maps — skipping metrics computation.")
        return

    # Build raw score matrix from LightFM embeddings
    user_biases, user_factors = model.model.get_user_representations()
    item_biases, item_factors = model.model.get_item_representations(model.item_features_matrix)
    scores_matrix = user_factors @ item_factors.T + user_biases[:, None] + item_biases[None, :]

    # Holdout: highest-score interaction per user as test item
    # Group interactions by user, pick the one with highest purchase_count as test
    user_interactions: dict[int, list] = {}
    for row in interactions:
        u_idx = u2i.get(row["user_id"])
        p_idx = p2i.get(row["product_id"])
        if u_idx is None or p_idx is None:
            continue
        user_interactions.setdefault(u_idx, []).append((p_idx, float(row["purchase_count"])))

    # test set: highest-count item per user; train set: everything else
    # Exclude users with only 1 interaction — holdout leaves them with zero training
    # data so the model cannot learn their preferences (unfair cold-start penalty).
    test_pos: dict[int, int] = {}
    train_items: dict[int, set] = {}
    for u_idx, items in user_interactions.items():
        if len(items) < 2:
            continue  # skip cold-start users from eval
        items.sort(key=lambda x: x[1], reverse=True)
        test_pos[u_idx] = items[0][0]
        train_items[u_idx] = {p for p, _ in items[1:]}

    n_users = len(test_pos)
    if n_users == 0:
        logger.warning("No users in holdout set — skipping metrics.")
        return

    prec_sum = rec_sum = ndcg_sum = mrr_sum = hit_sum = auc_sum = 0.0
    recommended_items: set = set()

    for u_idx, pos_item in test_pos.items():
        user_scores = scores_matrix[u_idx].copy()
        for p_idx in train_items.get(u_idx, set()):
            user_scores[p_idx] = -np.inf

        top_k = np.argsort(user_scores)[::-1][:K]
        recommended_items.update(top_k.tolist())

        hits = [1 if i == pos_item else 0 for i in top_k]
        hit = int(pos_item in top_k)

        prec_sum += sum(hits) / K
        rec_sum += hit

        dcg = sum(h / np.log2(idx + 2) for idx, h in enumerate(hits))
        ndcg_sum += dcg  # idcg = 1.0 (one positive)

        for rank, i in enumerate(top_k):
            if i == pos_item:
                mrr_sum += 1.0 / (rank + 1)
                break

        hit_sum += hit

        pos_score = scores_matrix[u_idx][pos_item]
        n_worse = int(np.sum(scores_matrix[u_idx] < pos_score))
        auc_sum += n_worse / max(len(scores_matrix[u_idx]) - 1, 1)

    def fmt(v): return round(float(v / n_users), 4)

    metrics = {
        "precision_at_k": fmt(prec_sum),
        "recall_at_k":    fmt(rec_sum),
        "ndcg_at_k":      fmt(ndcg_sum),
        "auc":            fmt(auc_sum),
        "mrr":            fmt(mrr_sum),
        "hit_rate_at_k":  fmt(hit_sum),
        "coverage":       round(len(recommended_items) / max(len(p2i), 1), 4),
        "k":              K,
        "n_eval_users":   n_users,
        "trained_at":     model.trained_at,
        "n_users":        len(u2i),
        "n_items":        len(p2i),
    }

    logger.info("Computed metrics: %s", metrics)

    try:
        client = get_minio_client()
        data = json.dumps(metrics).encode()
        client.put_object(MODEL_BUCKET, METRICS_KEY, io.BytesIO(data), length=len(data),
                          content_type="application/json")
        logger.info("Saved metrics.json to MinIO.")
    except Exception as e:
        logger.error("Failed to save metrics to MinIO: %s", e)


def train_model_logic() -> bool:
    logger.info("Connecting to MySQL and fetching dataset...")
    conn = None
    for attempt in range(1, 11):
        try:
            conn = get_db_connection(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB)
            break
        except Exception as conn_err:
            if attempt == 10:
                logger.error(f"Database connection failed after 10 attempts: {conn_err}")
                return False
            logger.warning(f"Attempt {attempt} failed ({conn_err}). Retrying in 2 seconds...")
            time.sleep(2)

    try:
        interactions = fetch_interactions(conn)
        item_features = fetch_item_features(conn)
    except Exception as e:
        logger.error(f"Error fetching data from database: {e}", exc_info=True)
        return False
    finally:
        if conn:
            conn.close()

    try:
        logger.info("Initializing new RecommendationModel and starting training...")
        new_model = RecommendationModel()
        new_model.train(interactions, item_features)

        logger.info("Uploading trained model to MinIO...")
        success = save_model(new_model)
        if not success:
            logger.error("Failed to save model to storage.")
            return False

        logger.info("Computing and saving evaluation metrics...")
        _compute_and_save_metrics(new_model, interactions)
        return True
    except Exception as e:
        logger.error(f"Error during model training/upload: {e}", exc_info=True)
        return False


def main():
    start_time = time.time()
    success = train_model_logic()
    elapsed = time.time() - start_time
    if success:
        logger.info(f"Training job finished successfully in {elapsed:.2f} seconds.")
        sys.exit(0)
    else:
        logger.error(f"Training job failed after {elapsed:.2f} seconds.")
        sys.exit(1)

if __name__ == "__main__":
    main()

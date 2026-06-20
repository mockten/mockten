import os
import sys
import time
import logging

from db import get_db_connection, fetch_interactions, fetch_item_features
from model import RecommendationModel
from storage import save_model

# Environment variables
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-service.default.svc.cluster.local")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation-trainer")

def train_model_logic() -> bool:
    """
    Connect to MySQL database, fetch interaction and feature data, train
    the recommendation model, and upload it to MinIO.
    Returns True if training and upload succeed, False otherwise.
    """
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
            logger.warning(f"Database connection attempt {attempt} failed ({conn_err}). Retrying in 2 seconds...")
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
        if success:
            logger.info("Model saved and uploaded successfully.")
            return True
        else:
            logger.error("Failed to save model to storage.")
            return False
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

import os
import asyncio
import logging
import random
from typing import Optional
import urllib.request
import json as _json
from fastapi import FastAPI, Query, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import get_db_connection, fetch_interactions, fetch_item_features, fetch_product_details
from model import RecommendationModel
from storage import load_model, save_model, get_minio_client, MODEL_BUCKET, MODEL_KEY
from minio.error import S3Error
from train import train_model_logic

# Environment variables
MYSQL_HOST = os.getenv("MYSQL_HOST", "mysql-service.default.svc.cluster.local")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

RANKING_SERVICE_URL = os.getenv("RANKING_SERVICE_URL", "http://ranking-service.default.svc.cluster.local:8080")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recommendation-service")

app = FastAPI(title="Recommendation Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables
model = RecommendationModel()
is_training_in_progress = False
training_lock = asyncio.Lock()
last_loaded_etag = None

class TrainRequest(BaseModel):
    force: Optional[bool] = False

async def train_model_task():
    global model, is_training_in_progress
    async with training_lock:
        if is_training_in_progress:
            logger.info("Training already in progress, skipping background trigger.")
            return
        is_training_in_progress = True

    try:
        logger.info("Starting background training of Recommendation model...")
        success = await asyncio.to_thread(train_model_logic)
        if success:
            logger.info("Background model training completed successfully.")
            await reload_model_if_needed()
        else:
            logger.error("Background model training failed.")
    except Exception as e:
        logger.error(f"Error during background model training: {e}", exc_info=True)
    finally:
        is_training_in_progress = False

async def reload_model_if_needed():
    global model, last_loaded_etag
    try:
        client = get_minio_client()
        
        def check_metadata():
            try:
                return client.stat_object(MODEL_BUCKET, MODEL_KEY)
            except S3Error as e:
                if e.code == "NoSuchKey":
                    return None
                raise e

        stat = await asyncio.to_thread(check_metadata)
        if stat is None:
            logger.info("No model object found in MinIO storage yet.")
            return

        if stat.etag != last_loaded_etag:
            logger.info(f"New model version detected (ETag: {stat.etag}). Reloading from MinIO...")
            loaded = await asyncio.to_thread(load_model)
            if loaded is not None:
                model = loaded
                last_loaded_etag = stat.etag
                logger.info(f"Model successfully loaded. Trained at: {model.trained_at}")
    except Exception as e:
        logger.error(f"Error checking/reloading model from MinIO: {e}")

async def poll_model_updates_loop():
    logger.info("Starting background MinIO model reload polling loop...")
    while True:
        await asyncio.sleep(30)
        await reload_model_if_needed()

@app.on_event("startup")
async def startup_event():
    logger.info("Performing initial model load/check...")
    await reload_model_if_needed()
    
    global model
    if not model.is_trained:
        logger.info("No model found in storage. Starting initial training in background...")
        asyncio.create_task(train_model_task())
    
    # Start the background polling loop to watch for model updates from CronJobs
    asyncio.create_task(poll_model_updates_loop())

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/recommend")
def get_recommendations(user_id: str = Query(..., description="Email or Username of the user"), limit: int = Query(10, description="Number of recommendations")):
    global model
    
    conn = get_db_connection(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB)
    try:
        # Fetch all available products to calculate scores for
        with conn.cursor() as cursor:
            cursor.execute("SELECT product_id, product_name, category_id, price FROM Product")
            all_products = cursor.fetchall()
            
        recommendations = model.recommend(user_id, all_products, limit=limit)
        
        if recommendations is not None and len(recommendations) > 0:
            return {
                "user_id": user_id,
                "recommendations": recommendations,
                "model_trained_at": model.trained_at,
                "strategy": "lightfm_warp"
            }
    except Exception as e:
        logger.error(f"Error during recommendation query: {e}")
    finally:
        conn.close()

    # Cold Start fallback: fetch from popular ranking
    logger.info(f"Cold Start/Fallback triggered for user {user_id}. Fetching popular items from Ranking Service...")
    try:
        with urllib.request.urlopen(f"{RANKING_SERVICE_URL}/api/ranking?category=all", timeout=3) as resp:
            ranking_data = _json.loads(resp.read().decode())
        if ranking_data is not None:
            ranking_list = ranking_data.get("ranking", [])
            
            # Apply offset (rotation) and shuffle to make recommendations look different from the popular ranking
            if ranking_list:
                offset = 3 % len(ranking_list)
                ranking_list = ranking_list[offset:] + ranking_list[:offset]
                random.shuffle(ranking_list)
            
            p_ids = [item["product_id"] for item in ranking_list]
            
            # Fetch real category_id and details from MySQL for the popular product IDs
            conn = get_db_connection(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB)
            try:
                products_details = fetch_product_details(conn, p_ids)
            finally:
                conn.close()
                
            recommendations = []
            for item in ranking_list:
                p_id = item["product_id"]
                p_detail = next((p for p in products_details if p["product_id"] == p_id), None)
                if p_detail:
                    cat_id = p_detail["category_id"]
                    recommendations.append({
                        "product_id": p_id,
                        "product_name": p_detail["product_name"],
                        "category_id": cat_id,
                        "price": float(p_detail["price"]),
                        "score": float(item.get("score", 0.0)),
                        "image_url": f"/api/storage/category_{cat_id}.png"
                    })
                    if len(recommendations) >= limit:
                        break
            
            return {
                "user_id": user_id,
                "recommendations": recommendations,
                "model_trained_at": model.trained_at if model.is_trained else None,
                "strategy": "popular_fallback"
            }
    except Exception as e:
        logger.error(f"Failed to fetch popular items from Ranking service: {e}")
        
    # Return empty fallback if even ranking fails
    return {
        "user_id": user_id,
        "recommendations": [],
        "model_trained_at": None,
        "strategy": "empty_fallback"
    }

@app.get("/similar")
def get_similar_items(product_id: str = Query(..., description="UUID of target product"), limit: int = Query(5, description="Number of similar items")):
    global model
    if not model.is_trained:
        return {
            "product_id": product_id,
            "similar_items": []
        }
        
    conn = get_db_connection(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB)
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT product_id, product_name FROM Product")
            all_products = cursor.fetchall()
            
        similar_items = model.get_similar_items(product_id, all_products, limit=limit)
        return {
            "product_id": product_id,
            "similar_items": similar_items
        }
    except Exception as e:
        logger.error(f"Error fetching similar items: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch similar items")
    finally:
        conn.close()

@app.get("/also-bought")
def get_also_bought(product_id: str = Query(..., description="UUID of the purchased product"), limit: int = Query(5, description="Number of results")):
    """Returns products frequently co-purchased with the given product_id, based on Order transaction history.
    Falls back to same-category products when order history is insufficient."""
    conn = get_db_connection(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB)
    try:
        with conn.cursor() as cursor:
            # Join Orders to Transactions twice:
            # t_target: the transaction for our product (in the same order)
            # t_other:  other transactions in the same order
            # transactions_json is a JSON array of transaction_id strings
            cursor.execute("""
                SELECT p.product_id, p.product_name, p.category_id, p.price, COUNT(*) AS co_count
                FROM `Order` o
                JOIN `Transaction` t_target
                  ON JSON_CONTAINS(o.transactions_json, JSON_QUOTE(t_target.transaction_id))
                JOIN `Transaction` t_other
                  ON JSON_CONTAINS(o.transactions_json, JSON_QUOTE(t_other.transaction_id))
                JOIN Product p ON t_other.product_id = p.product_id
                WHERE t_target.product_id = %s
                  AND t_other.product_id != %s
                GROUP BY p.product_id, p.product_name, p.category_id, p.price
                ORDER BY co_count DESC
                LIMIT %s
            """, (product_id, product_id, limit))
            rows = cursor.fetchall()

        if not rows:
            # Fallback: highest-rated products from the same category
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.product_id, p.product_name, p.category_id, p.price
                    FROM Product p
                    WHERE p.category_id = (SELECT category_id FROM Product WHERE product_id = %s LIMIT 1)
                      AND p.product_id != %s
                    ORDER BY p.avg_review DESC
                    LIMIT %s
                """, (product_id, product_id, limit))
                rows = cursor.fetchall()

        results = []
        for row in rows:
            results.append({
                "product_id": row["product_id"],
                "product_name": row["product_name"],
                "category_id": row["category_id"],
                "price": float(row["price"]),
                "image_url": f"/api/storage/{row['product_id']}.png",
            })

        return {"product_id": product_id, "also_bought": results, "count": len(results)}
    except Exception as e:
        logger.error(f"Error fetching also-bought items: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch also-bought items")
    finally:
        conn.close()


@app.post("/train")
def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    global is_training_in_progress
    if is_training_in_progress:
        return {
            "status": "already_training",
            "message": "Model training is already in progress in the background"
        }
        
    background_tasks.add_task(train_model_task)
    return {
        "status": "training_started",
        "message": "Model training initiated in background"
    }

@app.get("/model/status")
def get_model_status():
    global model, is_training_in_progress
    return {
        "is_trained": model.is_trained,
        "trained_at": model.trained_at,
        "is_training_in_progress": is_training_in_progress
    }

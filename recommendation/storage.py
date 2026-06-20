import os
import io
import pickle
from minio import Minio
from minio.error import S3Error

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio-service.default.svc.cluster.local:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MODEL_BUCKET = "models"
MODEL_KEY = "recommendation/lightfm_model.pkl"

def get_minio_client() -> Minio:
    # Disable secure/SSL for local development MinIO
    return Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False
    )

def ensure_bucket_exists(client: Minio):
    if not client.bucket_exists(MODEL_BUCKET):
        client.make_bucket(MODEL_BUCKET)

def save_model(model) -> bool:
    """
    Serialize the trained RecommendationModel and upload it to MinIO.
    """
    try:
        client = get_minio_client()
        ensure_bucket_exists(client)
        
        # Pickle the model object
        data = pickle.dumps(model)
        data_stream = io.BytesIO(data)
        
        client.put_object(
            MODEL_BUCKET,
            MODEL_KEY,
            data_stream,
            length=len(data),
            content_type="application/octet-stream"
        )
        print(f"Successfully saved model to MinIO at {MODEL_BUCKET}/{MODEL_KEY}")
        return True
    except Exception as e:
        print(f"Error saving model to MinIO: {e}")
        return False

def load_model():
    """
    Download and deserialize the RecommendationModel from MinIO.
    Returns None if the model does not exist or an error occurs.
    """
    try:
        client = get_minio_client()
        if not client.bucket_exists(MODEL_BUCKET):
            return None
        
        response = client.get_object(MODEL_BUCKET, MODEL_KEY)
        try:
            data = response.read()
            model = pickle.loads(data)
            print(f"Successfully loaded model from MinIO at {MODEL_BUCKET}/{MODEL_KEY}")
            return model
        finally:
            response.close()
            response.release_conn()
    except S3Error as e:
        if e.code == "NoSuchKey":
            print("No model file found in MinIO bucket yet.")
        else:
            print(f"MinIO S3Error while loading model: {e}")
        return None
    except Exception as e:
        print(f"Error loading model from MinIO: {e}")
        return None

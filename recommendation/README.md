# Recommendation Service

Recommendation microservice using collaborative filtering with LightFM.

## Decoupled Architecture

For scalability and resource separation, this service is split into two components that share the same Docker image:

1. **Serving (API)**: A stateless FastAPI app that loads the LightFM model from MinIO and serves `/recommend` and `/similar` endpoints. It automatically polls MinIO for model updates.
2. **Training (CronJob/Job)**: A standalone python script (`train.py`) that connects to MySQL, trains the model, uploads the serialized model to MinIO, and exits.

```
+------------------+     Loads model     +-------------+
|    MinIO S3      |<--------------------| FastAPI App | (Serving)
+------------------+   (polls updates)   +-------------+
         ^                                      |
         | Uploads model                        | Fallback Cold Start
         |                                      v
+------------------+                    +-----------------+
| Standalone Train |<-------------------| Ranking Service |
|    (train.py)    |  Queries purchase  +-----------------+
+------------------+      history       
         |                                      
         v                                      
+------------------+                            
|      MySQL       |                            
+------------------+                            
```

## Endpoints (via Kong Gateway)

| Path | Method | Description |
|---|---|---|
| `/api/recommendation` | GET | Recommendations for a user (`user_id`, `limit` query parameters) |
| `/api/recommendation/similar` | GET | Similar products (`product_id`, `limit` query parameters) |
| `/api/recommendation/train` | POST | Trigger model retraining (runs in background for local dev/testing) |
| `/api/recommendation/model/status` | GET | Get model training state and timestamp |

## Running the Container Modes

Both components use the same `mockten-recommendation` image:

### 1. Run Serving Container (Default)
Starts the FastAPI application.
```bash
docker run --name recommendation-service --network mockten_nw \
  -e MYSQL_HOST="mysql-service.default.svc.cluster.local" \
  -e MINIO_ENDPOINT="minio-service.default.svc.cluster.local:9000" \
  mockten-recommendation
```

### 2. Run Standalone Training Job (CronJob)
Trains the model, uploads to MinIO, and exits.
```bash
docker run --rm --name recommendation-trainer-job --network mockten_nw \
  -e MYSQL_HOST="mysql-service.default.svc.cluster.local" \
  -e MINIO_ENDPOINT="minio-service.default.svc.cluster.local:9000" \
  mockten-recommendation python train.py
```

In production/Kubernetes, this is run periodically as a K8s `CronJob`.

## Local Development Orchestration

Using `Taskfile.yaml`:
- **Run the complete environment**: `task build` (starts all containers including `recommendation-serving`).
- **Trigger training job container manually**: `task recommendation-train` (starts the standalone trainer container, which uploads the model to MinIO where it's picked up by the serving container).

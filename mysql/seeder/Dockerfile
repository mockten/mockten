# One-shot seeder image: runs behavior_seeder.py once and exits. Built for the
# IaC session to run as a Kubernetes Job after a fresh apply, so the seeding no
# longer depends on `kubectl run … pip install …` at the console.
#
# All configuration comes from the environment (see behavior_seeder.py):
#   MYSQL_HOST / MYSQL_PORT / MYSQL_USER / MYSQL_PASSWORD / MYSQL_DB
#   RANKING_API                  e.g. http://apigw-service.default.svc.cluster.local/api/ranking/update
#   RECOMMENDATION_TRAIN_API     e.g. http://apigw-service.default.svc.cluster.local/api/recommendation/train
FROM python:3.11-slim

WORKDIR /app

# Deps first for layer caching; pinned in requirements.txt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY behavior_seeder.py .

# Unbuffered so the Job's logs stream in real time.
ENV PYTHONUNBUFFERED=1

# Runs once and exits (non-zero on failure so the Job is marked failed).
CMD ["python", "behavior_seeder.py"]

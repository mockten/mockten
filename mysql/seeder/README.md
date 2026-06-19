# Behavior Seeder

## Overview
A seeder to insert the purchase behaviors of 50 development users into MySQL to generate training data for LightFM.

## Execution (K8s Environment)
```bash
# You can connect directly to the MySQL Pod, or run as a Kubernetes Job
kubectl run seeder --image=python:3.11-slim --restart=Never \
  --env="MYSQL_HOST=mysql-service.default.svc.cluster.local" \
  --env="MYSQL_PASSWORD=mocktenpassword" \
  --env="ACOUSTIC_GUITAR_PRODUCT_ID=9f9a6e2a-0cd8-4228-b80c-7b2fbfd5db6b" \
  -- bash -c "pip install pymysql requests && python behavior_seeder.py"
```

## Local Execution
```bash
cd mysql/seeder
pip install -r requirements.txt
MYSQL_HOST=localhost MYSQL_PORT=3306 python behavior_seeder.py
```


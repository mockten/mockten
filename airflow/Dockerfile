FROM apache/airflow:2.9.3-python3.11

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev build-essential \
    && rm -rf /var/lib/apt/lists/*
USER airflow

RUN pip install --no-cache-dir \
    pandas \
    pyarrow \
    pymysql \
    minio \
    scikit-learn

# lightfm requires Cython; best-effort
RUN pip install --no-cache-dir lightfm || echo "WARNING: lightfm unavailable"

COPY scripts/entrypoint.sh /entrypoint.sh
COPY dags/ /opt/airflow/dags/

EXPOSE 8080

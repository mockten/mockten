FROM apache/airflow:2.9.3-python3.11

USER root
RUN rm -f /etc/apt/sources.list.d/docker.list \
          /etc/apt/sources.list.d/mariadb.list \
          /etc/apt/sources.list.d/mssql-release.list \
          /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       gcc g++ build-essential default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*
USER airflow

RUN pip install --no-cache-dir \
    "apache-airflow[mysql]==2.9.3" \
    pandas \
    pyarrow \
    pymysql \
    minio \
    scikit-learn

# lightfm requires Cython; best-effort
RUN pip install --no-cache-dir lightfm || echo "WARNING: lightfm unavailable"

# Remove compiler toolchain after pip builds to shrink the image
USER root
RUN apt-get purge -y --auto-remove gcc g++ build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
USER airflow

COPY scripts/entrypoint.sh /entrypoint.sh
COPY dags/ /opt/airflow/dags/

EXPOSE 8080

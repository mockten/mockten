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

# lightfm requires Cython; best-effort.
# Same landmine as recommendation/Dockerfile: lightfm compiles from source and its
# setup.py defaults to -march=native, which bakes the builder's CPU into the .so
# and SIGILLs on any older one. Pin a baseline ISA so this image is portable too.
# Per-architecture: -march=x86-64 is x86-only and would break the arm64 build.
ARG TARGETARCH
ENV LIGHTFM_NO_CFLAGS=1
RUN case "${TARGETARCH:-amd64}" in \
      amd64) export CFLAGS="-march=x86-64 -mtune=generic -O3" ;; \
      arm64) export CFLAGS="-march=armv8-a -mtune=generic -O3" ;; \
      *)     export CFLAGS="-O3" ;; \
    esac && \
    pip install --no-cache-dir lightfm || echo "WARNING: lightfm unavailable"

# Remove compiler toolchain after pip builds to shrink the image
USER root
RUN apt-get purge -y --auto-remove gcc g++ build-essential pkg-config \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
USER airflow

COPY scripts/entrypoint.sh /entrypoint.sh
COPY dags/ /opt/airflow/dags/

EXPOSE 8080

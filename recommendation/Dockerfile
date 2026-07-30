# Stage 1: compile native extensions (gcc needed for lightfm)
FROM python:3.11-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends gcc g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
# lightfm has no wheels and compiles from source, and its setup.py defaults to
# -march=native. That bakes *the build machine's* instruction set into the .so:
# a GitHub runner with AVX-512 produces an image that SIGILLs the moment it
# imports lightfm on any older CPU — and it fails invisibly, because uvicorn's
# supervisor just respawns the dying worker, so the pod stays "Running" with no
# logs. It also makes the image non-deterministic: the same Dockerfile is fine or
# broken depending on which runner it lands on.
# Pin a baseline ISA so the artifact runs anywhere (local, k8s, GCP/AWS/Azure).
# The baseline is per-architecture: -march=x86-64 is an x86-only flag, so it must
# not leak into the arm64 build (compose builds natively on Apple Silicon).
# TARGETARCH is provided by BuildKit.
ARG TARGETARCH
ENV LIGHTFM_NO_CFLAGS=1
RUN case "${TARGETARCH:-amd64}" in \
      amd64) export CFLAGS="-march=x86-64 -mtune=generic -O3" ;; \
      arm64) export CFLAGS="-march=armv8-a -mtune=generic -O3" ;; \
      *)     export CFLAGS="-O3" ;; \
    esac && \
    echo "Building lightfm with CFLAGS=$CFLAGS (TARGETARCH=${TARGETARCH:-unset})" && \
    pip install --no-cache-dir -r requirements.txt

# Stage 2: lean runtime (no compiler toolchain, only libgomp1 for OpenMP .so)
FROM python:3.11-slim
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
# Remove build tools not needed at runtime (stale dist-info + pip/setuptools)
RUN rm -rf /usr/local/lib/python3.11/site-packages/wheel-0.45.1.dist-info \
           /usr/local/lib/python3.11/site-packages/pip \
           /usr/local/lib/python3.11/site-packages/pip-*.dist-info \
           /usr/local/lib/python3.11/site-packages/setuptools \
           /usr/local/lib/python3.11/site-packages/setuptools-*.dist-info \
           /usr/local/lib/python3.11/site-packages/_distutils_hack \
           /usr/local/lib/python3.11/site-packages/distutils-precedence.pth
COPY . .
EXPOSE 8080
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]

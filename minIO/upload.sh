#!/bin/bash
# 生成した商品画像を MinIO にアップロードするスクリプト
#
# 前提:
#   - mc (MinIO Client) がインストール済み
#   - または kubectl exec で minio-pod に直接 cp する
#
# 使い方:
#   ./upload.sh                          # image_gen/ 内の全 .png をアップロード
#   ./upload.sh <product_id>.png         # 指定ファイルのみアップロード

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MINIO_ALIAS="${MINIO_ALIAS:-local}"
BUCKET="photos"

if [ -n "$1" ]; then
  FILES=("${SCRIPT_DIR}/photos/$1")
else
  FILES=("${SCRIPT_DIR}/photos"/*.png)
fi

# Check if mc is installed on the host
if command -v mc >/dev/null 2>&1; then
  mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
  
  UPLOADED=0
  for FILE in "${FILES[@]}"; do
    BASENAME=$(basename "$FILE")
    if [ -f "$FILE" ]; then
      mc cp "$FILE" "${MINIO_ALIAS}/${BUCKET}/${BASENAME}" && \
        echo "✅ Uploaded: ${BASENAME}" && \
        UPLOADED=$((UPLOADED + 1))
    fi
  done
else
  # Fallback to docker cp and running mc inside the container
  UPLOADED=0
  for FILE in "${FILES[@]}"; do
    BASENAME=$(basename "$FILE")
    if [ -f "$FILE" ]; then
      docker cp "$FILE" minio-service.default.svc.cluster.local:/tmp/"$BASENAME" >/dev/null 2>&1 && \
      docker exec minio-service.default.svc.cluster.local mc cp /tmp/"$BASENAME" local/photos/"$BASENAME" >/dev/null 2>&1 && \
      docker exec minio-service.default.svc.cluster.local rm -f /tmp/"$BASENAME" >/dev/null 2>&1 && \
      echo "✅ Uploaded (via docker): ${BASENAME}" && \
      UPLOADED=$((UPLOADED + 1))
    fi
  done
fi

echo ""
echo "Done. Uploaded ${UPLOADED} image(s) to MinIO bucket '${BUCKET}'."

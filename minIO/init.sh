#!/bin/sh

# Start MinIO in background
/usr/bin/minio server /data --console-address ":9001" &

# Wait for MinIO to be up
sleep 5

# Setup mc and upload files
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/photos
mc cp --recursive /photos/ local/photos/

mc anonymous set download local/photos

# Wait indefinitely
wait
#!/usr/bin/env python3
"""
auto_upload_new.py
------------------
Downloadsフォルダにある最新のPNGファイルを指定のproduct_idでリネームし、
minIO/photosにコピーしてからMinIOにアップロードするスクリプト。

Usage:
  python3 auto_upload_new.py <product_id>
"""

import os
import sys
import glob
import shutil
import subprocess
import time

PHOTOS_DIR = os.path.join(os.path.dirname(__file__), "photos")
DOWNLOADS_DIR = os.path.expanduser("~/Downloads")
MINIO_BUCKET = "photos"

def get_latest_png_in_downloads(exclude_names=None):
    """Downloadsの最新PNGを返す（product_id.png形式のものは除外）"""
    pngs = glob.glob(os.path.join(DOWNLOADS_DIR, "*.png"))
    if not pngs:
        return None
    # 除外リスト
    if exclude_names:
        pngs = [p for p in pngs if os.path.basename(p) not in exclude_names]
    if not pngs:
        return None
    return max(pngs, key=os.path.getmtime)

def upload_to_minio(filepath, product_id):
    """mcコマンドでMinIOにアップロード（なければ直接HTTPで）"""
    filename = f"{product_id}.png"
    # Try mc first
    result = subprocess.run(
        ["mc", "cp", filepath, f"local/{MINIO_BUCKET}/{filename}"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"✅ MinIO upload via mc: {filename}")
        return True
    
    # Fallback: python minio client
    try:
        from minio import Minio
        client = Minio("localhost:9000", access_key="minioadmin", secret_key="minioadmin", secure=False)
        client.fput_object(MINIO_BUCKET, filename, filepath, content_type="image/png")
        print(f"✅ MinIO upload via python client: {filename}")
        return True
    except Exception as e:
        print(f"❌ MinIO upload failed: {e}")
        return False

def process_product(product_id, before_files=None):
    """
    Downloadsに新たに追加されたPNGを product_id.png としてリネームし、
    photos/にコピーしてMinIOにアップロード。
    before_files: 処理前にDownloadsにあったファイル名のset
    """
    target_filename = f"{product_id}.png"
    target_path = os.path.join(PHOTOS_DIR, target_filename)
    
    if before_files is not None:
        # Wait for new file to appear
        print(f"⏳ Waiting for new PNG in Downloads...")
        timeout = 300  # 5 minutes max
        start = time.time()
        new_file = None
        while time.time() - start < timeout:
            current = set(glob.glob(os.path.join(DOWNLOADS_DIR, "*.png")))
            new = current - before_files
            if new:
                new_file = max(new, key=os.path.getmtime)
                break
            time.sleep(2)
        if not new_file:
            print(f"❌ Timeout: No new PNG appeared in Downloads")
            return False
    else:
        new_file = get_latest_png_in_downloads()
        if not new_file:
            print(f"❌ No PNG found in Downloads")
            return False
    
    print(f"📁 Found new file: {os.path.basename(new_file)}")
    
    # Copy to photos dir with correct name
    shutil.copy2(new_file, target_path)
    print(f"📋 Copied to: {target_path}")
    
    # Upload to MinIO
    upload_to_minio(target_path, product_id)
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 auto_upload_new.py <product_id>")
        sys.exit(1)
    
    product_id = sys.argv[1]
    print(f"Processing product: {product_id}")
    
    # Snapshot current state
    before = set(glob.glob(os.path.join(DOWNLOADS_DIR, "*.png")))
    print(f"Current PNGs in Downloads: {len(before)}")
    
    success = process_product(product_id, before_files=before)
    sys.exit(0 if success else 1)

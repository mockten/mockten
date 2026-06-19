"""
check_missing.py
----------------
MinIOに画像が存在しない商品のリストを出力する。

出力例:
  Missing images: 480 / 500 products
  
  product_id                             product_name          category_id
  xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   Acoustic Guitar       02
  ...

Usage:
  python check_missing.py
  python check_missing.py --limit 20  # 最初の20件だけ表示
"""

import os
import argparse
import pymysql
from minio import Minio

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY", "minioadmin")
MINIO_BUCKET = "photos"

def get_all_products(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT product_id, product_name, category_id FROM Product ORDER BY category_id, product_name")
        return cur.fetchall()

def get_existing_images(minio_client):
    try:
        objects = minio_client.list_objects(MINIO_BUCKET)
        return {obj.object_name.replace(".png", "") for obj in objects}
    except Exception as e:
        print(f"Error listing objects: {e}")
        return set()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    
    conn = pymysql.connect(
        host=MYSQL_HOST, 
        port=MYSQL_PORT,
        user=MYSQL_USER, 
        password=MYSQL_PASSWORD, 
        db=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )
    minio = Minio(
        MINIO_ENDPOINT, 
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY, 
        secure=False
    )
    
    products = get_all_products(conn)
    existing = get_existing_images(minio)
    
    missing = [p for p in products if p["product_id"] not in existing]
    
    print(f"Missing images: {len(missing)} / {len(products)} products\n")
    print(f"{'product_id':<40} {'product_name':<30} {'category_id'}")
    print("-" * 80)
    
    display = missing[:args.limit] if args.limit else missing
    for p in display:
        print(f"{p['product_id']:<40} {p['product_name'][:28]:<30} {p['category_id']}")
    
    conn.close()

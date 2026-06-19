import os
import json
import pymysql
import argparse

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

def get_missing_products(conn, generated_ids):
    with conn.cursor() as cur:
        # Get all products ordered by category and name
        cur.execute("SELECT product_id, product_name, category_id FROM Product ORDER BY category_id, product_name")
        products = cur.fetchall()
    
    # Filter out products that have already been generated
    missing = [p for p in products if p["product_id"] not in generated_ids]
    return missing

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()
    
    # Load progress
    progress_file = os.path.join(os.path.dirname(__file__), "progress.json")
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            try:
                progress_data = json.load(f)
                generated_ids = set(progress_data.get("generated_product_ids", []))
            except Exception:
                generated_ids = set()
    else:
        generated_ids = set()
        
    conn = pymysql.connect(
        host=MYSQL_HOST, 
        port=MYSQL_PORT,
        user=MYSQL_USER, 
        password=MYSQL_PASSWORD, 
        db=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )
    
    missing = get_missing_products(conn, generated_ids)
    conn.close()
    
    # Output next batch as JSON
    next_batch = missing[:args.limit]
    print(json.dumps(next_batch, indent=2, ensure_ascii=False))

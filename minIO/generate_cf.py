import os
import json
import pymysql
import requests
import argparse
from datetime import datetime

# Load local environment variables from .env
def load_env():
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ[k.strip()] = v.strip()

load_env()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")

CF_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CF_TOKEN = os.getenv("CLOUDFLARE_TOKEN")

# Model options:
# - "@cf/stabilityai/stable-diffusion-xl-base-1.0"
# - "@cf/bytedance/stable-diffusion-xl-lightning"
# - "@cf/lykon/dreamshaper-8-lcm"
CF_MODEL = os.getenv("CF_MODEL", "@cf/stabilityai/stable-diffusion-xl-base-1.0")

def get_missing_products(conn, generated_ids):
    with conn.cursor() as cur:
        # Get all products ordered by category and name, including summary
        cur.execute("SELECT product_id, product_name, category_id, summary FROM Product ORDER BY category_id, product_name")
        products = cur.fetchall()
    
    missing = [p for p in products if p["product_id"] not in generated_ids]
    return missing

def generate_image_cf(prompt, product_id):
    if not CF_ACCOUNT_ID or not CF_TOKEN:
        raise ValueError("Missing Cloudflare Account ID or Token in environment variables.")
        
    url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/ai/run/{CF_MODEL}"
    headers = {
        "Authorization": f"Bearer {CF_TOKEN}",
        "Content-Type": "application/json"
    }
    body = {
        "prompt": prompt
    }
    
    print(f"Calling Cloudflare Workers AI ({CF_MODEL}) for product {product_id}...")
    response = requests.post(url, headers=headers, json=body, timeout=60)
    
    if response.status_code != 200:
        print(f"Error from Cloudflare API (HTTP {response.status_code}): {response.text}")
        return False
        
    # Check if the content is binary (image)
    content_type = response.headers.get("content-type", "")
    if "image" not in content_type:
        # Sometimes Cloudflare returns JSON error even with HTTP 200 (rare but possible)
        try:
            res_json = response.json()
            if not res_json.get("success", True):
                print(f"Cloudflare API returned failure JSON: {res_json}")
                return False
        except Exception:
            pass
            
    # Save the binary image
    photos_dir = os.path.join(os.path.dirname(__file__), "photos")
    os.makedirs(photos_dir, exist_ok=True)
    img_path = os.path.join(photos_dir, f"{product_id}.png")
    
    with open(img_path, "wb") as f:
        f.write(response.content)
        
    print(f"Saved image to {img_path}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=10, help="Number of images to generate in this run")
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
    
    total_missing = len(missing)
    print(f"Total missing products: {total_missing}")
    
    if total_missing == 0:
        print("All products already have images generated!")
        exit(0)
        
    batch = missing[:args.limit]
    print(f"Processing batch of {len(batch)} products...")
    
    success_count = 0
    for product in batch:
        pid = product["product_id"]
        name = product["product_name"]
        summary = product.get("summary") or ""
        
        # Build prompt
        clean_summary = summary.replace("\n", " ").strip()
        if clean_summary:
            prompt = f"{name}: {clean_summary}, clean light gray background, studio-shot product photo, 1:1 aspect ratio, bright lighting, high resolution"
        else:
            prompt = f"{name} on a clean light gray background, studio-shot product photo, 1:1 aspect ratio, bright lighting, high resolution"
            
        print(f"\nProduct: {name} (ID: {pid})")
        print(f"Prompt: {prompt}")
        
        try:
            success = generate_image_cf(prompt, pid)
            if success:
                # Add to progress.json
                # We can call python3 minIO/add_progress.py or run it directly in python
                pf = os.path.join(os.path.dirname(__file__), "progress.json")
                if os.path.exists(pf):
                    with open(pf, "r") as f:
                        try:
                            pdata = json.load(f)
                        except Exception:
                            pdata = {}
                else:
                    pdata = {}
                    
                gids = pdata.get("generated_product_ids", [])
                if pid not in gids:
                    gids.append(pid)
                pdata["generated_product_ids"] = gids
                pdata["last_updated"] = datetime.now().isoformat()
                pdata["total_count"] = 499
                
                with open(pf, "w") as f:
                    json.dump(pdata, f, indent=2)
                    
                print(f"Updated progress.json for {pid}")
                success_count += 1
            else:
                print(f"Failed to generate image for {name} ({pid}). Stopping batch execution.")
                break
        except Exception as e:
            print(f"Exception during generation for {name} ({pid}): {e}")
            break
            
    print(f"\nBatch processing finished. Successfully generated {success_count} / {len(batch)} images.")

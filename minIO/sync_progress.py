import os
import json
import pymysql
import subprocess
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

def delete_minio_image(pid, bucket="photos", alias="local"):
    filename = f"{pid}.png"
    try:
        res = subprocess.run(["command", "-v", "mc"], capture_output=True, text=True, shell=True)
        mc_exists = res.returncode == 0
    except Exception:
        mc_exists = False

    if mc_exists:
        cmd = f"mc rm {alias}/{bucket}/{filename}"
        subprocess.run(cmd, shell=True, capture_output=True)
    else:
        container_name = "minio-service.default.svc.cluster.local"
        cmd = f"docker exec {container_name} mc rm local/{bucket}/{filename}"
        subprocess.run(cmd, shell=True, capture_output=True)

def get_product_name(conn, pid):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT product_name FROM Product WHERE product_id = %s", (pid,))
            result = cur.fetchone()
            if result:
                return result["product_name"]
    except Exception:
        pass
    return "Unknown Product"

if __name__ == "__main__":
    photos_dir = os.path.join(os.path.dirname(__file__), "photos")
    progress_file = os.path.join(os.path.dirname(__file__), "progress.json")
    
    # 1. Scan existing local PNG files
    local_png_ids = set()
    if os.path.exists(photos_dir):
        for f in os.listdir(photos_dir):
            if f.endswith(".png"):
                pid = f[:-4] # strip .png
                local_png_ids.add(pid)
                
    # 2. Load progress.json
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            try:
                progress_data = json.load(f)
                generated_ids = progress_data.get("generated_product_ids", [])
            except Exception:
                print("❌ Error: progress.json is corrupted or empty.")
                exit(1)
    else:
        print("ℹ️ progress.json does not exist. No sync needed.")
        exit(0)
        
    # 3. Find IDs that are in progress.json but don't have local PNG files
    removed_ids = [pid for pid in generated_ids if pid not in local_png_ids]
    
    if not removed_ids:
        print("✨ progress.json is already fully synchronized with the local photos directory.")
        print(f"Total completed: {len(generated_ids)} products.")
        exit(0)
        
    print(f"🔍 Found {len(removed_ids)} product image(s) deleted from the filesystem.")
    print("Synchronizing progress.json and MinIO server...")
    
    # Connect to DB to print friendly names
    conn = None
    try:
        conn = pymysql.connect(
            host=MYSQL_HOST, 
            port=MYSQL_PORT,
            user=MYSQL_USER, 
            password=MYSQL_PASSWORD, 
            db=MYSQL_DB,
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"⚠️ Could not connect to database for friendly names: {e}")
        
    for pid in removed_ids:
        pname = get_product_name(conn, pid) if conn else "Unknown Product"
        print(f"  - 🗑️ Resetting: {pname} (ID: {pid})")
        # Delete from MinIO server bucket
        try:
            delete_minio_image(pid)
        except Exception as e:
            print(f"    ⚠️ Failed to delete from MinIO: {e}")
            
    if conn:
        conn.close()
        
    # Update progress.json
    updated_ids = [pid for pid in generated_ids if pid in local_png_ids]
    progress_data["generated_product_ids"] = updated_ids
    progress_data["last_updated"] = datetime.now().isoformat()
    
    with open(progress_file, "w") as f:
        json.dump(progress_data, f, indent=2)
        
    print(f"\n✅ Synchronization complete. Removed {len(removed_ids)} product(s) from progress.json.")
    print(f"New completed total: {len(updated_ids)} products.")
    print("You can now run the generation script to regenerate them.")

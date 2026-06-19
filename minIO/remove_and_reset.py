import os
import json
import argparse
import subprocess

def load_progress():
    progress_file = os.path.join(os.path.dirname(__file__), "progress.json")
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            try:
                return json.load(f), progress_file
            except Exception:
                return {}, progress_file
    return {}, progress_file

def save_progress(data, path):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def delete_local_image(pid):
    photos_dir = os.path.join(os.path.dirname(__file__), "photos")
    img_path = os.path.join(photos_dir, f"{pid}.png")
    if os.path.exists(img_path):
        os.remove(img_path)
        print(f"🗑️ Deleted local image: {img_path}")
        return True
    else:
        print(f"⚠️ Local image not found: {img_path}")
        return False

def delete_minio_image(pid, bucket="photos", alias="local"):
    filename = f"{pid}.png"
    # Try using host 'mc' command if installed
    try:
        res = subprocess.run(["command", "-v", "mc"], capture_output=True, text=True, shell=True)
        mc_exists = res.returncode == 0
    except Exception:
        mc_exists = False

    if mc_exists:
        # Run mc rm
        cmd = f"mc rm {alias}/{bucket}/{filename}"
        print(f"Running on host: {cmd}")
        subprocess.run(cmd, shell=True)
    else:
        # Fallback to docker exec inside minio container
        container_name = "minio-service.default.svc.cluster.local"
        cmd = f"docker exec {container_name} mc rm local/{bucket}/{filename}"
        print(f"Running via docker: {cmd}")
        subprocess.run(cmd, shell=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remove product images and reset progress for regeneration")
    parser.add_argument("product_ids", nargs="+", help="Product IDs to remove and reset")
    parser.add_argument("--alias", default="local", help="MinIO alias (default: local)")
    parser.add_argument("--bucket", default="photos", help="MinIO bucket (default: photos)")
    
    args = parser.parse_args()
    
    progress_data, progress_file_path = load_progress()
    generated_ids = progress_data.get("generated_product_ids", [])
    
    removed_count = 0
    for pid in args.product_ids:
        # 1. Remove from progress.json
        if pid in generated_ids:
            generated_ids.remove(pid)
            removed_count += 1
            print(f"✅ Removed from progress.json: {pid}")
        else:
            print(f"ℹ️ {pid} was not in progress.json")
            
        # 2. Delete local file
        delete_local_image(pid)
        
        # 3. Delete from MinIO server
        try:
            delete_minio_image(pid, bucket=args.bucket, alias=args.alias)
        except Exception as e:
            print(f"⚠️ Failed to delete from MinIO: {e}")
            
    if removed_count > 0:
        progress_data["generated_product_ids"] = generated_ids
        save_progress(progress_data, progress_file_path)
        print(f"\nSuccessfully reset {removed_count} product(s) in progress.json.")
        print("Run the generation script (Gemini or Cloudflare) again to regenerate them.")
    else:
        print("\nNo progress changes were made.")

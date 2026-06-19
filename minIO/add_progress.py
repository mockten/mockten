import os
import json
import argparse
from datetime import datetime

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("product_ids", nargs="+", help="Product IDs to add to progress")
    args = parser.parse_args()
    
    progress_file = os.path.join(os.path.dirname(__file__), "progress.json")
    
    if os.path.exists(progress_file):
        with open(progress_file, "r") as f:
            try:
                progress_data = json.load(f)
            except Exception:
                progress_data = {}
    else:
        progress_data = {}
        
    generated_ids = progress_data.get("generated_product_ids", [])
    
    added_count = 0
    for pid in args.product_ids:
        if pid not in generated_ids:
            generated_ids.append(pid)
            added_count += 1
            
    progress_data["generated_product_ids"] = generated_ids
    progress_data["last_updated"] = datetime.now().isoformat()
    progress_data["total_count"] = 499
    
    with open(progress_file, "w") as f:
        json.dump(progress_data, f, indent=2)
        
    print(f"Added {added_count} product ID(s) to progress.json.")

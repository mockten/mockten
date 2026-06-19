#!/usr/bin/env python3
"""
behavior_seeder.py
------------------
Seeder to directly INSERT purchase behavior of 50 development users into MySQL.
Aimed at generating training data for LightFM.
"""

import os
import uuid
import random
import json
import pymysql
import requests
from datetime import datetime, timedelta

# Configuration
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3306"))
MYSQL_USER = os.getenv("MYSQL_USER", "mocktenusr")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "mocktenpassword")
MYSQL_DB = os.getenv("MYSQL_DB", "mocktendb")
RANKING_API = os.getenv("RANKING_API", "http://localhost/api/ranking/update")

ACOUSTIC_GUITAR_PRODUCT_ID = os.getenv("ACOUSTIC_GUITAR_PRODUCT_ID", "9f9a6e2a-0cd8-4228-b80c-7b2fbfd5db6b")

# Persona -> Preferred Category Mapping
PERSONA_CATEGORIES = {
    "tech_lovers":    {"primary": ["07"], "secondary": ["08", "04"]},
    "sports_fans":    {"primary": ["12"], "secondary": ["08", "16"]},
    "foodies":        {"primary": ["03"], "secondary": ["13", "16"]},
    "book_worms":     {"primary": ["01"], "secondary": ["02", "08"]},
    "family_buyers":  {"primary": ["10", "11"], "secondary": ["09", "05"]},
    "fashion_lovers": {"primary": ["06"], "secondary": ["13", "15"]},
}

USER_PERSONA_MAP = {
    **{f"dev_user_{i:03d}@example.com": "tech_lovers" for i in range(1, 11)},
    **{f"dev_user_{i:03d}@example.com": "sports_fans" for i in range(11, 21)},
    **{f"dev_user_{i:03d}@example.com": "foodies" for i in range(21, 31)},
    **{f"dev_user_{i:03d}@example.com": "book_worms" for i in range(31, 39)},
    **{f"dev_user_{i:03d}@example.com": "family_buyers" for i in range(39, 46)},
    **{f"dev_user_{i:03d}@example.com": "fashion_lovers" for i in range(46, 51)},
}

def get_db_connection():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )

def main():
    print(f"Connecting to MySQL database at {MYSQL_HOST}:{MYSQL_PORT}...")
    conn = get_db_connection()
    try:
        with conn.cursor() as cursor:
            # 1. Read all 500 products and category info from MySQL
            cursor.execute("SELECT product_id, category_id, price FROM Product")
            all_products = cursor.fetchall()
            print(f"Loaded {len(all_products)} products from database.")
            
            if not all_products:
                print("Error: No products found in the database. Please run init.sql first.")
                return

            # Organize products by category
            products_by_category = {}
            for p in all_products:
                cat = p["category_id"]
                if cat not in products_by_category:
                    products_by_category[cat] = []
                products_by_category[cat].append(p)

            # 2. Simulate purchases for all 50 users
            total_purchases_simulated = 0
            
            for i in range(1, 51):
                user_num = f"{i:03d}"
                user_id = f"dev_user_{user_num}@example.com"
                geo_id = f"geo_dev_{user_num}"
                pm_id = f"pm_dev_{user_num}"
                
                # Simulate the list of products this user purchases
                purchases = simulate_purchases(user_id, products_by_category, all_products)
                print(f"Simulating {len(purchases)} purchases for {user_id}...")
                
                # Generate purchase dates over the last 60 days
                now = datetime.utcnow()
                purchase_times = sorted([
                    now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23), minutes=random.randint(0, 59))
                    for _ in range(len(purchases))
                ])

                for idx, p_id in enumerate(purchases):
                    # Fetch details for the product
                    product = next((p for p in all_products if p["product_id"] == p_id), None)
                    if not product:
                        continue
                    
                    price = product["price"]
                    cat_id = product["category_id"]
                    
                    # Generate IDs for this order/transaction/payment
                    order_id = str(uuid.uuid4())
                    tx_id = str(uuid.uuid4())
                    payment_id = str(uuid.uuid4())
                    
                    created_at = purchase_times[idx]
                    created_at_str = created_at.strftime('%Y-%m-%d %H:%M:%S')
                    
                    # Calculations
                    subtotal = price
                    shipping = round(random.uniform(5.00, 15.00), 2)
                    total = subtotal + shipping
                    
                    # Insert Transaction
                    cursor.execute(
                        "INSERT INTO `Transaction` (transaction_id, product_id, geo_id, status, leg_type, created_at, updated_at) "
                        "VALUES (%s, %s, %s, 'delivered', 'road', %s, %s)",
                        (tx_id, p_id, geo_id, created_at_str, created_at_str)
                    )
                    
                    # Insert Order
                    tx_json = json.dumps([tx_id])
                    cursor.execute(
                        "INSERT INTO `Order` (order_id, user_id, currency, subtotal_amount, shipping_amount, total_amount, quantity, status, transactions_json, created_at, updated_at) "
                        "VALUES (%s, %s, 'USD', %s, %s, %s, 1, 'delivered', %s, %s, %s)",
                        (order_id, user_id, subtotal, shipping, total, tx_json, created_at_str, created_at_str)
                    )
                    
                    # Insert Payment
                    order_list_json = json.dumps([order_id])
                    idem_key = f"idem-{order_id}"
                    cursor.execute(
                        "INSERT INTO Payment (payment_id, order_id_list, payment_method_id, amount, currency, status, idempotency_key, created_at, updated_at) "
                        "VALUES (%s, %s, %s, %s, 'USD', 'captured', %s, %s, %s)",
                        (payment_id, order_list_json, pm_id, total, idem_key, created_at_str, created_at_str)
                    )
                    
                    # Update Stock (decrement by 1 if stock is positive)
                    cursor.execute(
                        "UPDATE Stock SET stocks = GREATEST(stocks - 1, 0) WHERE product_id = %s",
                        (p_id,)
                    )
                    
                    # Try to call Ranking service update API to update Redis ranking
                    try:
                        resp = requests.post(RANKING_API, json={
                            "product_id": p_id,
                            "category_id": int(cat_id),
                            "quantity": 1
                        }, timeout=2)
                        # We don't fail if ranking service is not up
                    except Exception:
                        pass
                    
                    total_purchases_simulated += 1
            
            conn.commit()
            print(f"Successfully simulated and committed {total_purchases_simulated} purchases.")
            
    finally:
        conn.close()

def simulate_purchases(user_id, products_by_category, all_products):
    persona = USER_PERSONA_MAP[user_id]
    primary_cats = PERSONA_CATEGORIES[persona]["primary"]
    secondary_cats = PERSONA_CATEGORIES[persona]["secondary"]
    
    # Number of purchases per user: 10 to 25 times
    purchase_count = random.randint(10, 25)
    purchases = []
    last_category = None
    
    # dev_user_001's first purchase is always the Acoustic Guitar
    if user_id == "dev_user_001@example.com":
        # Check if acoustic guitar is available
        guitar_exists = any(p["product_id"] == ACOUSTIC_GUITAR_PRODUCT_ID for p in all_products)
        if guitar_exists:
            purchases.append(ACOUSTIC_GUITAR_PRODUCT_ID)
            last_category = "02"
        else:
            print("Warning: Acoustic Guitar product ID not found. Skipping first guitar order.")
    
    for _ in range(purchase_count - len(purchases)):
        rand = random.random()
        
        # 80% chance: pick from last category or preferred persona categories
        if rand < 0.80:
            if last_category and last_category in products_by_category:
                candidates = products_by_category[last_category]
            else:
                # Fallback to persona categories
                pref_cat = random.choice(primary_cats + secondary_cats)
                candidates = products_by_category.get(pref_cat, all_products)
        else:
            # 20% chance: completely random
            candidates = all_products
        
        # Exclude products already purchased in this simulation session
        candidates = [p for p in candidates if p["product_id"] not in purchases]
        if not candidates:
            # Fallback allowing duplicates
            candidates = all_products
            
        product = random.choice(candidates)
        purchases.append(product["product_id"])
        last_category = product["category_id"]
        
    return purchases

if __name__ == "__main__":
    main()

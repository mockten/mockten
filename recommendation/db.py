import pymysql

def get_db_connection(host, port, user, password, db):
    return pymysql.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=db,
        cursorclass=pymysql.cursors.DictCursor
    )

def fetch_interactions(conn) -> list[dict]:
    """
    Fetch user-item interactions from Transaction and Geo tables.
    """
    query = """
    SELECT g.user_id, t.product_id, COUNT(*) as purchase_count
    FROM `Transaction` t
    JOIN Geo g ON t.geo_id = g.geo_id
    WHERE t.status IN ('delivered', 'paid', 'shipped', 'picking', 'booked', 'picked_up', 'in_transit')
    GROUP BY g.user_id, t.product_id
    """
    with conn.cursor() as cursor:
        cursor.execute(query)
        return cursor.fetchall()

def fetch_item_features(conn) -> list[dict]:
    """
    Fetch product category, price range, and review band features for LightFM hybrid mode.
    """
    query = """
    SELECT product_id, category_id, 
           CASE 
             WHEN price < 20 THEN 'price_low'
             WHEN price < 100 THEN 'price_mid'  
             ELSE 'price_high'
           END AS price_range,
           CASE 
             WHEN avg_review >= 4.0 THEN 'highly_rated'
             WHEN avg_review >= 3.0 THEN 'rated'
             ELSE 'unrated'
           END AS review_band
    FROM Product
    """
    with conn.cursor() as cursor:
        cursor.execute(query)
        features = cursor.fetchall()
        
    result = []
    for f in features:
        result.append({
            "product_id": f["product_id"],
            "features": [
                f"cat_{f['category_id']}",
                f.get("price_range", "price_mid"),
                f.get("review_band", "unrated")
            ]
        })
    return result

def fetch_product_details(conn, product_ids: list[str]) -> list[dict]:
    """
    Fetch detailed product metadata for specific product IDs.
    """
    if not product_ids:
        return []
    
    format_strings = ','.join(['%s'] * len(product_ids))
    query = f"""
    SELECT product_id, product_name, category_id, price, avg_review
    FROM Product
    WHERE product_id IN ({format_strings})
    """
    with conn.cursor() as cursor:
        cursor.execute(query, tuple(product_ids))
        return cursor.fetchall()

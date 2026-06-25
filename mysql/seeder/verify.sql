-- Verify user count (Expected: 50)
SELECT COUNT(*) AS user_count FROM PaymentProfile WHERE user_id LIKE 'dev_user_%';

-- Verify product count (Expected: 500 products across all categories)
SELECT category_id, COUNT(*) AS cnt FROM Product GROUP BY category_id ORDER BY category_id;

-- Verify order count (Expected: 50 users * 15 average orders = ~750 orders)
SELECT COUNT(*) AS order_count FROM `Order` WHERE user_id LIKE 'dev_user_%';

-- Verify interaction count (Check if enough for LightFM training, Expected: 700+ interactions)
SELECT COUNT(*) AS interaction_count FROM `Order` WHERE user_id LIKE 'dev_user_%';

-- Verify dev_user_001's first ordered product is the Acoustic Guitar
SELECT o.user_id, t.product_id, p.product_name, o.created_at
FROM `Order` o
JOIN `Transaction` t ON JSON_CONTAINS(o.transactions_json, JSON_QUOTE(t.transaction_id))
JOIN Product p ON t.product_id = p.product_id
WHERE o.user_id = 'dev_user_001@example.com'
ORDER BY o.created_at ASC
LIMIT 1;

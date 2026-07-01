DELETE FROM Geo WHERE user_id = 'superadmin@example.com';
INSERT INTO Geo (geo_id, user_id, country_code, postal_code, prefecture, city, town, building_name, room_number, latitude, longitude, is_primary)
VALUES ('test-geo-superadmin', 'superadmin@example.com', 'JP', '105-0011', 'Tokyo', 'Minato City', 'Shibakoen 4-2-8', 'Tokyo Tower', '', 35.6586, 139.7454, 1);

-- Geo for test orders
INSERT INTO Geo (geo_id, user_id, country_code, postal_code, prefecture, city, town, building_name, room_number, latitude, longitude, is_primary)
VALUES
  ('test-geo-hc-001', 'customer1@gmail.com', 'JP', '100-0001', 'Tokyo', 'Chiyoda', 'Chiyoda 1-1', '', '', 35.6895, 139.6917, 0),
  ('test-geo-hc-002', 'customer2@gmail.com', 'JP', '100-0002', 'Tokyo', 'Chiyoda', 'Chiyoda 1-2', '', '', 35.6900, 139.6920, 0)
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);

-- Transactions for healthcompany's product (fe88e32f-678f-403a-bed2-331a4ff406c2 = Protein bar)
-- Last month transactions (35 days ago)
INSERT INTO `Transaction` (transaction_id, product_id, geo_id, status, leg_type, created_at)
VALUES
  ('tx-hc-prev-001', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-001', 'delivered', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
  ('tx-hc-prev-002', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-001', 'delivered', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 32 DAY)),
  ('tx-hc-prev-003', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-002', 'delivered', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  geo_id     = VALUES(geo_id),
  status     = VALUES(status),
  leg_type   = VALUES(leg_type),
  created_at = VALUES(created_at);

-- This month transactions
INSERT INTO `Transaction` (transaction_id, product_id, geo_id, status, leg_type, created_at)
VALUES
  ('tx-hc-cur-001', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-001', 'delivered', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY)),
  ('tx-hc-cur-002', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-002', 'in_transit', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
  ('tx-hc-cur-003', 'fe88e32f-678f-403a-bed2-331a4ff406c2', 'test-geo-hc-001', 'quoted', 'road', DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  geo_id     = VALUES(geo_id),
  status     = VALUES(status),
  leg_type   = VALUES(leg_type),
  created_at = VALUES(created_at);

-- Orders for last month
INSERT INTO `Order` (order_id, user_id, currency, subtotal_amount, shipping_amount, total_amount, quantity, status, transactions_json, created_at)
VALUES
  ('ord-hc-prev-001', 'customer1@gmail.com', 'USD', 9.00, 1.00, 10.00, 3, 'delivered', JSON_ARRAY('tx-hc-prev-001'), DATE_SUB(CURRENT_DATE, INTERVAL 35 DAY)),
  ('ord-hc-prev-002', 'customer1@gmail.com', 'USD', 6.00, 1.00,  7.00, 2, 'delivered', JSON_ARRAY('tx-hc-prev-002'), DATE_SUB(CURRENT_DATE, INTERVAL 32 DAY)),
  ('ord-hc-prev-003', 'customer2@gmail.com', 'USD', 3.00, 1.00,  4.00, 1, 'delivered', JSON_ARRAY('tx-hc-prev-003'), DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY))
ON DUPLICATE KEY UPDATE
  user_id           = VALUES(user_id),
  currency          = VALUES(currency),
  subtotal_amount   = VALUES(subtotal_amount),
  shipping_amount   = VALUES(shipping_amount),
  total_amount      = VALUES(total_amount),
  quantity          = VALUES(quantity),
  status            = VALUES(status),
  transactions_json = VALUES(transactions_json),
  created_at        = VALUES(created_at);

-- Orders for this month
INSERT INTO `Order` (order_id, user_id, currency, subtotal_amount, shipping_amount, total_amount, quantity, status, transactions_json, created_at)
VALUES
  ('ord-hc-cur-001', 'customer1@gmail.com', 'USD', 9.00, 1.00, 10.00, 3, 'delivered', JSON_ARRAY('tx-hc-cur-001'), DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY)),
  ('ord-hc-cur-002', 'customer2@gmail.com', 'USD', 6.00, 1.00,  7.00, 2, 'paid',      JSON_ARRAY('tx-hc-cur-002'), DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY)),
  ('ord-hc-cur-003', 'customer1@gmail.com', 'USD', 3.00, 1.00,  4.00, 1, 'created',   JSON_ARRAY('tx-hc-cur-003'), DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY))
ON DUPLICATE KEY UPDATE
  user_id           = VALUES(user_id),
  currency          = VALUES(currency),
  subtotal_amount   = VALUES(subtotal_amount),
  shipping_amount   = VALUES(shipping_amount),
  total_amount      = VALUES(total_amount),
  quantity          = VALUES(quantity),
  status            = VALUES(status),
  transactions_json = VALUES(transactions_json),
  created_at        = VALUES(created_at);

-- Create Seller table
CREATE TABLE IF NOT EXISTS Seller (
  seller_id VARCHAR(64) PRIMARY KEY,
  seller_name VARCHAR(255),
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Category table
CREATE TABLE IF NOT EXISTS Category (
  category_id VARCHAR(3) PRIMARY KEY,
  category_name VARCHAR(255),
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Product table
CREATE TABLE IF NOT EXISTS Product (
  product_id VARCHAR(36) PRIMARY KEY,
  product_name VARCHAR(255),
  seller_id VARCHAR(64),
  price INT,
  category_id VARCHAR(36),
  summary TEXT,
  product_condition ENUM('new', 'used') NOT NULL DEFAULT 'new',
  geo_id VARCHAR(64),
  regist_day DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Stock table
CREATE TABLE IF NOT EXISTS Stock (
  product_id VARCHAR(36) PRIMARY KEY,
  stocks INT
);

-- Create Wishlist table
CREATE TABLE IF NOT EXISTS Wishlist (
  user_id VARCHAR(36) PRIMARY KEY,
  product_ids JSON NOT NULL,
  updated DATETIME
);

-- Create ShippingRate table
CREATE TABLE IF NOT EXISTS ShippingRate (
  country_code CHAR(2),
  shipping_type ENUM('standard', 'express') NOT NULL,
  rate_per_10km FLOAT NOT NULL,
  PRIMARY KEY (country_code, shipping_type)
);

-- Create DomesicAirCost table
CREATE TABLE IF NOT EXISTS DomesticAirCost (
  origin VARCHAR(10),
  destination VARCHAR(10),
  cost_usd DECIMAL(10,2),
  PRIMARY KEY (origin, destination)
);

-- Create SeaCost table
CREATE TABLE IF NOT EXISTS SeaCost (
  origin_country_code VARCHAR(10),
  destination_country_code VARCHAR(10),
  cost_usd DECIMAL(10,2),
  PRIMARY KEY (origin_country_code, destination_country_code)
);

-- Create AirCost table
CREATE TABLE IF NOT EXISTS AirCost (
  origin VARCHAR(10),
  destination VARCHAR(10),
  cost_usd DECIMAL(10,2),
  PRIMARY KEY (origin, destination)
);

-- Create Geo table
CREATE TABLE IF NOT EXISTS Geo (
  user_id VARCHAR(36) PRIMARY KEY,
  country_code VARCHAR(2),
  postal_code VARCHAR(36),
  prefecture VARCHAR(50),
  city VARCHAR(100),
  town VARCHAR(100),
  building_name VARCHAR(100),
  room_number VARCHAR(20),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7)
);

-- Create Order table
CREATE TABLE IF NOT EXISTS `Order` (
  order_id         VARCHAR(36) PRIMARY KEY,
  user_id          VARCHAR(255) NOT NULL,
  currency         CHAR(3)      NOT NULL DEFAULT 'USD',
  subtotal_amount  DECIMAL(12,2) NOT NULL,
  shipping_amount  DECIMAL(12,2) NOT NULL,
  total_amount     DECIMAL(12,2) NOT NULL,
  quantity         INT,
  status           ENUM('created','paid','picking','shipped','delivered','canceled','refunded') NOT NULL DEFAULT 'created',
  transactions_json JSON NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order_status (status)
);

-- Create Transaction table
CREATE TABLE IF NOT EXISTS `Transaction` (
  transaction_id VARCHAR(36) PRIMARY KEY,
  product_id     VARCHAR(36) NOT NULL,
  user_id        VARCHAR(255) NOT NULL,
  status         ENUM('quoted','booked','picked_up','in_transit','delayed','delivered','canceled','failed') NOT NULL DEFAULT 'quoted',
  leg_type       ENUM('road','air','sea') NOT NULL DEFAULT 'road',
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tx_user    (user_id),
  KEY idx_tx_product (product_id),
  KEY idx_tx_legtype (leg_type)
);

-- Create PaymentProfile table
CREATE TABLE IF NOT EXISTS PaymentProfile (
  user_id            VARCHAR(255) PRIMARY KEY,
  stripe_customer_id VARCHAR(64)  NOT NULL,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create PaymentMethod table
CREATE TABLE IF NOT EXISTS PaymentMethod (
  payment_method_id        VARCHAR(36) PRIMARY KEY,
  user_id                  VARCHAR(255) NOT NULL,
  stripe_customer_id       VARCHAR(64)  NOT NULL,
  stripe_payment_method_id VARCHAR(64)  NOT NULL,
  brand                    VARCHAR(20)  NOT NULL,              -- 'visa','mastercard'
  last4                    CHAR(4)      NOT NULL,
  exp_month                TINYINT      NOT NULL,
  exp_year                 SMALLINT     NOT NULL,
  is_default               TINYINT(1)   NOT NULL DEFAULT 0,
  status                   ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at               DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_pm (user_id, stripe_payment_method_id),
  KEY idx_user_default (user_id, is_default),
  FOREIGN KEY (user_id) REFERENCES PaymentProfile(user_id)
);

-- Create Payment table
CREATE TABLE IF NOT EXISTS Payment (
  payment_id        VARCHAR(36) PRIMARY KEY,
  order_id_list     JSON NOT NULL,
  payment_method_id VARCHAR(36) NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          CHAR(3) NOT NULL,
  status            ENUM('authorized','captured','failed','canceled','refunded') NOT NULL,
  idempotency_key   VARCHAR(64),
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payment_idem (idempotency_key)
);

-- Insert Category data
INSERT INTO Category (category_id, category_name)
VALUES
('01', 'Books'),
('02', 'Music'),
('03', 'Food&Drink'),
('04', 'Game'),
('05', 'Home'),
('06', 'Fashion'),
('07', 'Electronics'),
('08', 'Hobby'),
('09', 'Toy'),
('10', 'Kids'),
('11', 'Baby'),
('12', 'Sports&Outdoor'),
('13', 'Beauty'),
('14', 'Car'),
('15', 'Gifts'),
('16', 'Health'),
('99', 'Other')
ON DUPLICATE KEY UPDATE
  category_name = VALUES(category_name);

-- Insert Product data
INSERT INTO Product (product_id, product_name, seller_id, price, category_id, summary, product_condition, geo_id)
VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 'Bone conduction earphones', 'headphonecompany@example.com', 500, '07', 'Experience clear sound without blocking your ears.', 'new','mocktenHubJP'),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 'Lemongrass', 'greengrocer@example.com', 6, '03', 'Fresh and aromatic lemongrass perfect for cooking or tea.', 'new', 'mocktenHubSG'),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 'Playing cards', 'toycompany@example.com', 5, '09', 'Standard deck of playing cards for endless fun.', 'used','mocktenHubJP'),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 'Protain bar', 'healthcompany@example.com', 20, '16', 'Delicious protein bars to power your workout.', 'new','mocktenHubJP'),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 'Snowboard', 'sportscompany@example.com', 100, '12', 'Designed for extreme winter sports with durability and sound clarity.', 'used','mocktenHubJP'),
('ad8e41bd-a9ff-4d18-9aed-3bcb8fa3bfc4','Strawberry Chocolate','sweets@example.com',10,'03','Sweet strawberry chocolate snack.','new','mocktenHubJP'),
('7b1c5c71-6e88-4b72-9ad0-1e2d6b9b6111','Balsamic Vinegar','cooking@example.com',12,'03','Rich balsamic vinegar ideal for cooking and salads.','new','mocktenHubSG'),
('e91b19b6-cb8e-4abd-ae3c-72fb0ea58491','Honey (Hachimitsu)','cooking@example.com',14,'03','Pure natural honey perfect for tea or desserts.','new','mocktenHubJP'),
('1da5ef1b-2c41-4c3a-b8d2-e74048e0f92a','Ketchup Bottle','cooking@example.com',8,'03','Classic tomato ketchup for everyday meals.','new','mocktenHubSG'),
('0b2cbf64-f73e-4c69-9f89-647db1e19fb4','Nabe Soup Base','cooking@example.com',11,'03','Warm soup base perfect for hot pot dishes.','new','mocktenHubSG'),
('fb28d68b-fd2d-4db9-9d6b-dbb13f63f24f','Parmesan Cheese','cooking@example.com',16,'03','Finely grated parmesan cheese for pasta.','new','mocktenHubJP'),
('c8ba2aec-ec56-46dd-a62b-067087b22628','Soy Sauce Bottle','cooking@example.com',9,'03','Traditional soy sauce to enhance flavor.','new','mocktenHubJP'),
('a0a27644-61f1-47cd-88ea-e4e886f6bb1b','Bottle Can Coffee','drink@example.com',6,'03','Refreshing canned coffee for a quick boost.','new','mocktenHubJP'),
('a8c4e635-8502-4d7b-b3e4-c730d7d34fa4','Beer','drink@example.com',15,'03','Smooth lager beer in a classic bottle.','new','mocktenHubSG'),
('e63d496d-5a93-4e31-a623-5c55a3b2f941','Brandy','drink@example.com',18,'03','Rich aromatic brandy for relaxing moments.','new','mocktenHubJP'),
('f203372b-e650-4e98-b67b-269ceaa1d01a','Zero Cola','drink@example.com',7,'03','Sugar-free cola with crisp taste.','new','mocktenHubSG'),
('5bd23c48-72b2-4b80-badc-cd56b314d073','Cup Soup','drink@example.com',5,'03','Simple and warm instant cup soup.','new','mocktenHubJP'),
('0ef627dd-d8d1-44b3-a340-0c56bebda12d','Energy Drink Can','drink@example.com',8,'03','Energy drink for an instant refreshment.','new','mocktenHubSG'),
('404586d7-d357-4659-90fb-91e6aedc2f13','Milk','drink@example.com',9,'03','Fresh milk conveniently packed with cap.','new','mocktenHubJP'),
('9a487e3c-8d90-4e8c-8e9c-49f1e801b4af','Yasai Vegetable Juice','drink@example.com',6,'03','Healthy vegetable juice full of nutrients.','new','mocktenHubSG'),
('a8cfbaa9-3b6d-4474-9558-28b8983d9332','Salad Chicken','food@example.com',12,'03','Tender salad chicken ready to eat.','new','mocktenHubJP'),
('8d13b89f-029d-4621-8ac3-22065d7d25df','Miso Cup Ramen','food@example.com',7,'03','Rich miso-flavored instant ramen.','new','mocktenHubJP'),
('f2d5e4f1-e459-4623-b665-995dcde9f5fa','Low-Sodium Cup Ramen','food@example.com',7,'03','Light cup ramen with reduced salt.','new','mocktenHubSG'),
('9d37823d-0ad5-4b44-b70f-83aab7b8e2a1','Yakisoba Cup','food@example.com',6,'03','Savory instant yakisoba noodles.','new','mocktenHubSG'),
('fc5fb21c-ffe1-46dc-a5cb-bc56071f6203','Freeze-Dried Meal','food@example.com',15,'03','Lightweight freeze-dried food for convenience.','new','mocktenHubJP'),
('5c0ed03e-3706-4e1e-b6d8-7cc6b6df3c0f','Strawberry Sandwich','food@example.com',12,'03','Sweet strawberry cream fruit sandwich.','new','mocktenHubJP'),
('73d062cf-6d55-434e-b825-c83dfaa5eaf4','Nattou Pack','food@example.com',5,'03','Traditional Japanese fermented soybeans.','new','mocktenHubSG'),
('b72c04cf-5571-4a77-bec1-4c4e56d0d965','Yakiniku Meat Set','food@example.com',18,'03','Freshly prepared yakiniku BBQ set.','new','mocktenHubJP'),
('d40144ee-e2a3-4740-8090-ccdc92ed8f2f','Oatmeal','food@example.com',10,'03','Healthy oatmeal perfect for breakfast.','new','mocktenHubSG'),
('e79e4bbb-3f65-4bdf-9dda-6ce0656c9f8a','Kashipan Sweet Bread Set','food@example.com',6,'03','Soft sweet breads for snacks.','new','mocktenHubJP'),
('ff2bf87c-ae70-4cc1-8bb5-fa923c4ba8a7','Laksa','food@example.com',12,'03','Spicy and rich laksa-flavored noodles.','new','mocktenHubSG'),
('4e2a7db7-4762-4d55-b5e0-fb9b6053320e','Frozen Shrimp','food@example.com',14,'03','Fresh frozen shrimp for cooking.','new','mocktenHubJP'),
('fa55d8e3-291e-4f06-a690-2b0b4f7d8e5b','Retort Curry','food@example.com',9,'03','Ready-to-eat rich curry meal.','new','mocktenHubSG'),
('65fd3bbd-2743-4e72-9e63-4d5a3eca6f86','Watermelon (Round)','fruit@example.com',13,'03','Fresh round watermelon.','new','mocktenHubSG'),
('8b7460c3-dc13-4a66-915f-2f64d716c607','Watermelon (Square)','fruit@example.com',16,'03','Unique square-shaped watermelon.','new','mocktenHubJP'),
('aaf4d6ea-61a0-4afb-a386-34a6a91e6e6a','Strawberry Jam','jam@example.com',8,'03','Sweet strawberry jam for bread.','new','mocktenHubSG'),
('c5ec7a88-b4eb-4f47-a832-3fa4c5ca5aa0','Marmalade','jam@example.com',8,'03','Bitter-sweet orange marmalade.','new','mocktenHubJP'),
('b91a5d68-6acb-48e7-8e5d-3d85b7e76af2','Blueberry Jam','jam@example.com',9,'03','Rich blueberry jam full of flavor.','new','mocktenHubSG'),
('50cbbe87-385e-4a60-b0d5-99b6ac0a969d','Apple Jam','jam@example.com',7,'03','Classic apple jam with mild sweetness.','new','mocktenHubJP'),
('9a1ed557-4ea2-4523-959c-712fc3b9b748','PET Bottle Water','water@example.com',5,'03','Refreshing clean bottled water.','new','mocktenHubJP'),
('e8f085de-89dd-4574-9dfd-f7c1352f9a25','Vegetables Mix','vegetable@example.com',7,'03','Fresh assorted vegetables.','new','mocktenHubSG'),
('4b9f1c23-8e9a-4c26-a347-995046dfbb5d','Cut Vegetables','vegetable@example.com',6,'03','Pre-cut vegetables for easy cooking.','new','mocktenHubJP'),
('24f0dd61-4663-4a0b-8cd0-d3c762ddc090','Frozen Vegetables','vegetable@example.com',8,'03','Frozen mixed vegetables.','new','mocktenHubSG'),
('12b8cb8c-6ef9-4bb4-a022-2fd8f8d2b878','Donut','sweets@example.com',6,'03','Sweet and fluffy donut snack.','new','mocktenHubJP'),
('bfd759cf-a8eb-47b1-a23d-dcba3f17366a','Chocolate','sweets@example.com',11,'03','Cute chocolate perfect for Valentine’s Day.','new','mocktenHubSG'),
('c8a1b74b-d2c4-4d5d-a845-176b5457ec36','Space Food','space@example.com',20,'03','Lightweight space-ready food pack.','new','mocktenHubSG')
ON DUPLICATE KEY UPDATE
  product_name       = VALUES(product_name),
  seller_id          = VALUES(seller_id),
  price              = VALUES(price),
  category_id        = VALUES(category_id),
  summary            = VALUES(summary),
  product_condition  = VALUES(product_condition),
  geo_id             = VALUES(geo_id);

-- Insert Stock data
INSERT INTO Stock (product_id, stocks)
VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 20),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 50),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 5),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 18),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 6),
('ad8e41bd-a9ff-4d18-9aed-3bcb8fa3bfc4', 6),
('7b1c5c71-6e88-4b72-9ad0-1e2d6b9b6111', 30),
('e91b19b6-cb8e-4abd-ae3c-72fb0ea58491', 18),
('1da5ef1b-2c41-4c3a-b8d2-e74048e0f92a', 33),
('0b2cbf64-f73e-4c69-9f89-647db1e19fb4', 48),
('fb28d68b-fd2d-4db9-9d6b-dbb13f63f24f', 63),
('c8ba2aec-ec56-46dd-a62b-067087b22628', 78),
('a0a27644-61f1-47cd-88ea-e4e886f6bb1b', 93),
('a8c4e635-8502-4d7b-b3e4-c730d7d34fa4', 80),
('e63d496d-5a93-4e31-a623-5c55a3b2f941', 67),
('f203372b-e650-4e98-b67b-269ceaa1d01a', 54),
('5bd23c48-72b2-4b80-badc-cd56b314d073', 41),
('0ef627dd-d8d1-44b3-a340-0c56bebda12d', 28),
('404586d7-d357-4659-90fb-91e6aedc2f13', 15),
('9a487e3c-8d90-4e8c-8e9c-49f1e801b4af', 2),
('a8cfbaa9-3b6d-4474-9558-28b8983d9332', 14),
('8d13b89f-029d-4621-8ac3-22065d7d25df', 26),
('f2d5e4f1-e459-4623-b665-995dcde9f5fa', 38),
('9d37823d-0ad5-4b44-b70f-83aab7b8e2a1', 50),
('fc5fb21c-ffe1-46dc-a5cb-bc56071f6203', 62),
('5c0ed03e-3706-4e1e-b6d8-7cc6b6df3c0f', 74),
('73d062cf-6d55-434e-b825-c83dfaa5eaf4', 86),
('b72c04cf-5571-4a77-bec1-4c4e56d0d965', 98),
('d40144ee-e2a3-4740-8090-ccdc92ed8f2f', 10),
('e79e4bbb-3f65-4bdf-9dda-6ce0656c9f8a', 4),
('ff2bf87c-ae70-4cc1-8bb5-fa923c4ba8a7', 38),
('4e2a7db7-4762-4d55-b5e0-fb9b6053320e', 45),
('fa55d8e3-291e-4f06-a690-2b0b4f7d8e5b', 54),
('65fd3bbd-2743-4e72-9e63-4d5a3eca6f86', 29),
('8b7460c3-dc13-4a66-915f-2f64d716c607', 66),
('aaf4d6ea-61a0-4afb-a386-34a6a91e6e6a', 13),
('c5ec7a88-b4eb-4f47-a832-3fa4c5ca5aa0', 75),
('b91a5d68-6acb-48e7-8e5d-3d85b7e76af2', 1),
('50cbbe87-385e-4a60-b0d5-99b6ac0a969d', 84),
('9a1ed557-4ea2-4523-959c-712fc3b9b748', 15),
('e8f085de-89dd-4574-9dfd-f7c1352f9a25', 7),
('4b9f1c23-8e9a-4c26-a347-995046dfbb5d', 22),
('24f0dd61-4663-4a0b-8cd0-d3c762ddc090', 2),
('12b8cb8c-6ef9-4bb4-a022-2fd8f8d2b878', 39),
('bfd759cf-a8eb-47b1-a23d-dcba3f17366a', 5),
('c8a1b74b-d2c4-4d5d-a845-176b5457ec36', 43)
ON DUPLICATE KEY UPDATE
  stocks = VALUES(stocks);

-- Insert ShippingRate data
INSERT INTO ShippingRate (country_code, shipping_type, rate_per_10km)
VALUES
('JP', 'standard', 0.08),
('JP', 'express',  0.16),
('SG', 'standard', 0.10),
('SG', 'express',  0.20)
ON DUPLICATE KEY UPDATE
  rate_per_10km = VALUES(rate_per_10km);

-- Insert DomesicAirCost table
INSERT INTO DomesticAirCost (origin, destination, cost_usd)
VALUES
('NRT', 'HND', 0.75),
('HND', 'NRT', 0.75),
('HND', 'KIX', 1.75),
('KIX', 'HND', 1.75),
('HND', 'CTS', 2.25),
('CTS', 'HND', 2.25),
('HND', 'FUK', 2.75),
('FUK', 'HND', 2.75),
('HND', 'NGO', 1.50),
('NGO', 'HND', 1.50),
('KIX', 'FUK', 2.13),
('FUK', 'KIX', 2.13),
('CTS', 'KIX', 2.38),
('KIX', 'CTS', 2.38),
('FUK', 'NGO', 2.00),
('NGO', 'FUK', 2.00)
ON DUPLICATE KEY UPDATE
  cost_usd = VALUES(cost_usd);

-- Insert SeaCost table
INSERT INTO SeaCost (origin_country_code, destination_country_code, cost_usd)
VALUES
('JP', 'SG', 4.50),
('SG', 'JP', 4.50)
ON DUPLICATE KEY UPDATE
  cost_usd = VALUES(cost_usd);

-- Insert AirCost data (IATA codes only where direct flights exist)
INSERT INTO AirCost (origin, destination, cost_usd)
VALUES
('SIN', 'NRT', 12.00),
('SIN', 'HND', 11.50),
('SIN', 'KIX', 10.80),
('SIN', 'NGO', 11.00),
('SIN', 'FUK', 10.50),
('SIN', 'CTS', 12.50)
ON DUPLICATE KEY UPDATE
  cost_usd = VALUES(cost_usd);

-- Insert Geo data
INSERT INTO Geo (user_id, country_code, postal_code, prefecture, city, town, building_name, latitude, longitude)
VALUES
('mocktenHubJP','JP','143-0006', 'Tokyo', 'Ota-ku', 'Heiwajima', 'Mockten Hub Japan', 35.5774, 139.7516),
('mocktenHubSG','SG','118423','Singapore','Singapore','2 Pasir Panjang Rd','Mockten Hub Singapore', 1.2754, 103.7957),
('customer1@gmail.com','JP','810-8660', 'Fukuoka', 'Chuo Ward', 'Jigyohama', 'Paypay Dome', 33.5954, 130.3621),
('customer2@gmail.com','JP','279-0031', 'Chiba', 'Urayasu', 'Maihama 1-1', 'Tokyo Disney Resort', 35.6329, 139.8804),
('SIN','SG','819643','Singapore','Singapore','Changi','Singapore Changi Airport', 1.3575574, 103.9884812),
('SGP','SG','118424','Singapore','Singapore','1 Pasir Panjang Rd','Pasir Panjang Terminal', 1.2702, 103.7669),
('NRT','JP','286-0104','Chiba','Narita','Narita','Narita International Airport', 35.7758714, 140.3933101),
('HND','JP','144-0041','Tokyo','Ota-ku','Haneda','Tokyo Haneda Airport', 35.5456924, 139.7760994),
('KIX','JP','549-0001','Osaka','Izumisano','Senshu','Kansai International Airport', 34.4342, 135.2328),
('CTS','JP','066-0012','Hokkaido','Chitose','','New Chitose Airport', 42.7752, 141.6923),
('FUK','JP','812-0003','Fukuoka','Fukuoka','Hakata','Fukuoka Airport', 33.5859, 130.4500),
('NGO','JP','479-0881','Aichi','Tokoname','Centrair','Chubu Centrair Airport', 34.8584, 136.8054),
('TYOP','JP','135-0063','Tokyo','Koto-ku','4-chōme-8 Ariake','Tokyo Port', 35.6329, 139.7966)
ON DUPLICATE KEY UPDATE
  country_code = VALUES(country_code),
  postal_code  = VALUES(postal_code),
  prefecture   = VALUES(prefecture),
  city         = VALUES(city),
  town         = VALUES(town),
  building_name = VALUES(building_name),
  latitude     = VALUES(latitude),
  longitude    = VALUES(longitude);

-- Dummy PaymentProfile:
INSERT INTO PaymentProfile (user_id, stripe_customer_id)
VALUES ('customer1@gmail.com', 'cus_123456789'),
       ('customer2@gmail.com', 'cus_987654321')
ON DUPLICATE KEY UPDATE
  stripe_customer_id = VALUES(stripe_customer_id);

-- Dummy PaymentMethod:
INSERT INTO PaymentMethod (
  payment_method_id, user_id, stripe_customer_id, stripe_payment_method_id,
  brand, last4, exp_month, exp_year, is_default, status
) VALUES
('pm_local_001', 'customer1@gmail.com', 'cus_123456789', 'pm_aaaa1111', 'visa', '4242', 12, 2027, 1, 'active'),
('pm_local_002', 'customer2@gmail.com', 'cus_987654321', 'pm_bbbb2222', 'mastercard', '4444',  9, 2026, 1, 'active')
ON DUPLICATE KEY UPDATE
  stripe_customer_id       = VALUES(stripe_customer_id),
  stripe_payment_method_id = VALUES(stripe_payment_method_id),
  brand                    = VALUES(brand),
  last4                    = VALUES(last4),
  exp_month                = VALUES(exp_month),
  exp_year                 = VALUES(exp_year),
  is_default               = VALUES(is_default),
  status                   = VALUES(status);

-- Transaction: dummy 3 patterns
INSERT INTO `Transaction` (transaction_id, product_id, user_id, status, leg_type)
VALUES
-- road only
('tx-rl-001', 'b150d47f-f4fb-40a2-a336-ac8e897af607', 'customer1@gmail.com', 'quoted', 'road'),
-- road→air→road
('tx-air-001-road1','b150d47f-f4fb-40a2-a336-ac8e897af607','customer2@gmail.com','quoted','road'),
('tx-air-001-air',  'b150d47f-f4fb-40a2-a336-ac8e897af607','customer2@gmail.com','quoted','air'),
('tx-air-001-road2','b150d47f-f4fb-40a2-a336-ac8e897af607','customer2@gmail.com','quoted','road'),
-- road→sea→road
('tx-sea-001-road1','580414f1-e962-4f6c-a461-d88d168e7cb1','customer2@gmail.com','quoted','road'),
('tx-sea-001-sea',  '580414f1-e962-4f6c-a461-d88d168e7cb1','customer2@gmail.com','quoted','sea'),
('tx-sea-001-road2','580414f1-e962-4f6c-a461-d88d168e7cb1','customer2@gmail.com','quoted','road')
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  user_id    = VALUES(user_id),
  status     = VALUES(status),
  leg_type   = VALUES(leg_type);

-- Order:
INSERT INTO `Order` (order_id, user_id, currency, subtotal_amount, shipping_amount, total_amount, quantity, status, transactions_json)
VALUES
('ord-rl-001','customer1@gmail.com','USD',500.00,0.23,500.23,1,'created',
 JSON_ARRAY('tx-rl-001')),
('ord-air-001','customer1@gmail.com','USD',100.00,0.69,100.69,1,'created',
 JSON_ARRAY('tx-air-001-road1','tx-air-001-air','tx-air-001-road2')),
('ord-sea-001','customer2@gmail.com','USD',  6.00,4.60, 10.60,1,'created',
 JSON_ARRAY('tx-sea-001-road1','tx-sea-001-sea','tx-sea-001-road2'))
ON DUPLICATE KEY UPDATE
  user_id          = VALUES(user_id),
  currency         = VALUES(currency),
  subtotal_amount  = VALUES(subtotal_amount),
  shipping_amount  = VALUES(shipping_amount),
  total_amount     = VALUES(total_amount),
  quantity         = VALUES(quantity),
  status           = VALUES(status),
  transactions_json = VALUES(transactions_json);

-- Payment:
INSERT INTO Payment (payment_id, order_id_list, payment_method_id, amount, currency, status, idempotency_key)
VALUES
('pay-rl-001',JSON_ARRAY('ord-rl-001'),'pm_local_001',500.23,'USD','authorized','idem-ord-rl-001-1'),
('pay-air-001',JSON_ARRAY('ord-air-001'),'pm_local_001',100.69,'USD','captured','idem-ord-air-001-1'),
('pay-sea-001',JSON_ARRAY('ord-sea-001'),'pm_local_002', 10.60,'USD','captured','idem-ord-sea-001-1')
ON DUPLICATE KEY UPDATE
  order_id_list     = VALUES(order_id_list),
  payment_method_id = VALUES(payment_method_id),
  amount            = VALUES(amount),
  currency          = VALUES(currency),
  status            = VALUES(status),
  idempotency_key   = VALUES(idempotency_key);
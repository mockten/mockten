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
  user_id VARCHAR(36)PRIMARY KEY,
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

-- Insert Category data
INSERT INTO Category (category_id, category_name) VALUES
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
('99', 'Other');

-- Insert Product data
INSERT INTO Product (product_id, product_name, seller_id, price, category_id, summary, product_condition, geo_id) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 'Bone conduction earphones', 'headphonecompany@example.com', 500, '07', 'Experience clear sound without blocking your ears.', 'new','mocktenHubJP'),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 'Lemongrass', 'greengrocer@example.com', 6, '03', 'Fresh and aromatic lemongrass perfect for cooking or tea.', 'new', 'mocktenHubSG'),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 'Playing cards', 'toycompany@example.com', 5, '09', 'Standard deck of playing cards for endless fun.', 'used','mocktenHubJP'),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 'Protain bar', 'healthcompany@example.com', 20, '16', 'Delicious protein bars to power your workout.', 'new','mocktenHubJP'),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 'Snowboard', 'sportscompany@example.com', 100, '12', 'Designed for extreme winter sports with durability and sound clarity.', 'used','mocktenHubJP');

-- Insert Stock data
INSERT INTO Stock (product_id, stocks) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 20),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 50),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 5),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 18),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 6);

-- Insert ShippingRate data
INSERT INTO ShippingRate (country_code, shipping_type, rate_per_10km) VALUES
('JP', 'standard', 0.08),
('JP', 'express',  0.16),
('SG', 'standard', 0.10),
('SG', 'express',  0.20);

-- Insert DomesicAirCost table
INSERT INTO DomesticAirCost (origin, destination, cost_usd) VALUES
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
('NGO', 'FUK', 2.00);

-- Insert SeaCost table
INSERT INTO SeaCost (origin_country_code, destination_country_code, cost_usd) VALUES
('JP', 'SG', 4.50),
('SG', 'JP', 4.50);

-- Insert AirCost data (IATA codes only where direct flights exist)
INSERT INTO AirCost (origin, destination, cost_usd) VALUES
('SIN', 'NRT', 12.00),
('SIN', 'HND', 11.50),
('SIN', 'KIX', 10.80),
('SIN', 'NGO', 11.00),
('SIN', 'FUK', 10.50),
('SIN', 'CTS', 12.50);

-- Insert Geo data
INSERT INTO Geo (user_id, country_code, postal_code, prefecture, city, town, building_name, latitude, longitude) VALUES
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
('TYOP','JP','135-0063','Tokyo','Koto-ku','4-chōme-8 Ariake','Tokyo Port', 35.6329, 139.7966);
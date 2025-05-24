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

-- Insert Seller data
INSERT INTO Seller (seller_id, seller_name) VALUES
('a38025d8-3598-4ccf-9d70-7e6dbf6edd09', 'Headphone company'),
('d3b4f7a37-0e05-4e04-8409-e5b0a55cf669', 'Greengrocer'),
('4dad4396-7f8b-46b8-a087-0ac3c63aeee9', 'Toy company'),
('3cd8eabe-000d-4d5e-84eb-9cd6979cc0a6', 'Health company'),
('4377ba6b-e236-404b-a0e9-388126f7ee48', 'Sports company');

-- Insert Product data
INSERT INTO Product (product_id, product_name, seller_id, price, category_id, summary) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 'Bone conduction earphones', 'a38025d8-3598-4ccf-9d70-7e6dbf6edd09', 500, '07', 'Experience clear sound without blocking your ears.'),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 'Lemongrass', 'd3b4f7a37-0e05-4e04-8409-e5b0a55cf669', 6, '03', 'Fresh and aromatic lemongrass perfect for cooking or tea.'),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 'Playing cards', '4dad4396-7f8b-46b8-a087-0ac3c63aeee9', 5, '09', 'Standard deck of playing cards for endless fun.'),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 'Protain bar', '3cd8eabe-000d-4d5e-84eb-9cd6979cc0a6', 20, '16', 'Delicious protein bars to power your workout.'),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 'Snowboard', '4377ba6b-e236-404b-a0e9-388126f7ee48', 100, '12', 'Designed for extreme winter sports with durability and sound clarity.');

-- Insert Stock data
INSERT INTO Stock (product_id, stocks) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 20),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 50),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 5),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 18),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 6);
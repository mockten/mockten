CREATE TABLE Seller (
  seller_id VARCHAR(255) PRIMARY KEY,
  seller_name VARCHAR(255)
);

CREATE TABLE Product (
  product_id VARCHAR(255) PRIMARY KEY,
  product_name VARCHAR(255),
  seller_id VARCHAR(255),
  price INT,
  category INT,
  summary TEXT,
  regist_day DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE Stock (
  product_id VARCHAR(255) PRIMARY KEY,
  stocks INT
);

CREATE TABLE Wishlist (
  user_id VARCHAR(255) PRIMARY KEY,
  product_ids JSON NOT NULL, 
  updated_at DATETIME
);

INSERT INTO Seller (seller_id, seller_name) VALUES
('a38025d8-3598-4ccf-9d70-7e6dbf6edd09', 'Headphone company'),
('d3b4f7a37-0e05-4e04-8409-e5b0a55cf669', 'Greengrocer'),
('4dad4396-7f8b-46b8-a087-0ac3c63aeee9', 'Toy company'),
('3cd8eabe-000d-4d5e-84eb-9cd6979cc0a6', 'Health company'),
('4377ba6b-e236-404b-a0e9-388126f7ee48', 'Sports company');

INSERT INTO Product (product_id, product_name, seller_id, price, category, summary) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 'Bone conduction earphones', 'a38025d8-3598-4ccf-9d70-7e6dbf6edd09', 500, 1, 'Experience clear sound without blocking your ears.'),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 'Lemongrass', 'd3b4f7a37-0e05-4e04-8409-e5b0a55cf669', 6, 2, 'Fresh and aromatic lemongrass perfect for cooking or tea.'),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 'Playing cards', '4dad4396-7f8b-46b8-a087-0ac3c63aeee9', 5, 3, 'Standard deck of playing cards for endless fun.'),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 'Protain bar', '3cd8eabe-000d-4d5e-84eb-9cd6979cc0a6', 20, 2, 'Delicious protein bars to power your workout.'),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 'Snowboard', '4377ba6b-e236-404b-a0e9-388126f7ee48', 100, 4, 'Designed for extreme winter sports with durability and sound clarity.');

INSERT INTO Stock (product_id, stocks) VALUES
('b150d47f-f4fb-40a2-a336-ac8e897af607', 20),
('580414f1-e962-4f6c-a461-d88d168e7cb1', 50),
('91e438c6-f073-4c57-95b3-0f98ccdedf34', 5),
('fe88e32f-678f-403a-bed2-331a4ff406c2', 18),
('d82f659a-a1ff-47f5-afb8-c93c02702fa4', 6);

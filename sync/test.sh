#!/bin/bash

MYSQL_HOST="mysql-service.default.svc.cluster.local"
MYSQL_USER="mocktenusr"
MYSQL_PASS="mocktenpassword"
MYSQL_DB="mocktendb"

# Update product price
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB -e "
UPDATE Product SET price = price + 10 WHERE product_id = 'b150d47f-f4fb-40a2-a336-ac8e897af607';
"

# Update seller name
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB -e "
UPDATE Seller SET seller_name = CONCAT(seller_name, ' Updated') WHERE seller_id = 'a38025d8-3598-4ccf-9d70-7e6dbf6edd09';
"

# Update product name
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB -e "
UPDATE Product SET product_name = CONCAT(product_name, ' New') WHERE product_id = '580414f1-e962-4f6c-a461-d88d168e7cb1';
"

# Insert a new product
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASS -D $MYSQL_DB -e "
INSERT INTO Product (product_id, product_name, seller_id, price, category, summary) VALUES (
  UUID(), 'New Test Product', 'd3b4f7a37-0e05-4e04-8409-e5b0a55cf669', 99, 3, 'Test product for checking insertion'
);
"

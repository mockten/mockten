#!/bin/bash

# JP: Tokyo Tower
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/profile \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u-jp-001","postal_code":"105-0011","prefecture":"Tokyo","city":"Minato City","town":"Shibakoen 4-2-8","building_name":"Tokyo Tower","room_number":"","country_code":"jp"}'
sleep 1

# SG: Marina Bay Sands
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/profile  \
  -H "Content-Type: application/json" \
  -d '{"user_id":"u-sg-001","postal_code":"018956","prefecture":"","city":"Singapore","town":"10 Bayfront Ave","building_name":"Marina Bay Sands","room_number":"","country_code":"sg"}'
sleep 1

# US: Oracle Park
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/profile  \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "u-us-002",
    "postal_code": "94107",
    "prefecture": "CA",
    "city": "San Francisco",
    "town": "24 Willie Mays Plaza",
    "building_name": "",
    "room_number": "",
    "country_code": "us"
  }'
sleep 1

# FR: Eiffel Tower
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost/api/profile  \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "u-fr-001",
    "postal_code": "75007",
    "prefecture": "",
    "city": "Paris",
    "town": "Av. Gustave Eiffel",
    "building_name": "",
    "room_number": "",
    "country_code": "fr"
  }'
sleep 1



curl "http://localhost/api/shipping?user_id=customer1@gmail.com&product_id=b150d47f-f4fb-40a2-a336-ac8e897af607"

sleep 1

curl "http://localhost/api/shipping?user_id=customer2@gmail.com&product_id=b150d47f-f4fb-40a2-a336-ac8e897af607"


sleep 1

curl "http://localhost/api/shipping?user_id=SIN&product_id=580414f1-e962-4f6c-a461-d88d168e7cb1"

sleep 1

curl "http://localhost/api/shipping?user_id=customer1@gmail.com&product_id=580414f1-e962-4f6c-a461-d88d168e7cb1"

sleep 1

curl "http://localhost/api/shipping?user_id=customer2@gmail.com&product_id=580414f1-e962-4f6c-a461-d88d168e7cb1"

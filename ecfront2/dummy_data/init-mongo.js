db = db.getSiblingDB('product_info');

db.products.insertMany([
  {
    "product_id": "p1001",
    "product_name": "Product 1",
    "seller_name": "Sellar A",
    "stocks": 50,
    "category": [1, 3],
    "rank": 5,
    "main_image": "/images/img1.jpg",
    "image_path": ["/images/img1.jpg"],
    "summary": "This is product 1",
    "regist_day": new Date("2023-01-01"),
    "last_update": new Date("2023-01-05")
  },
  {
    "product_id": "p1002",
    "product_name": "Product 2",
    "seller_name": "Sellar B",
    "stocks": 20,
    "category": [2, 4],
    "rank": 4,
    "main_image": "/images/img2.jpg",
    "image_path": ["/images/img2.jpg"],
    "summary": "This is product 2",
    "regist_day": new Date("2023-02-01"),
    "last_update": new Date("2023-02-05")
  },
  {
    "product_id": "p1003",
    "product_name": "Product 3",
    "seller_name": "Sellar C",
    "stocks": 75,
    "category": [1, 5],
    "rank": 3,
    "main_image": "/images/img3.jpg",
    "image_path": ["/images/img3.jpg"],
    "summary": "This is product 3",
    "regist_day": new Date("2023-03-01"),
    "last_update": new Date("2023-03-05")
  },
  {
    "product_id": "p1004",
    "product_name": "Product 4",
    "seller_name": "Sellar D",
    "stocks": 100,
    "category": [2, 3],
    "rank": 2,
    "main_image": "/images/img4.jpg",
    "image_path": ["/images/img4.jpg"],
    "summary": "This is product 4",
    "regist_day": new Date("2023-04-01"),
    "last_update": new Date("2023-04-05")
  },
  {
    "product_id": "p1005",
    "product_name": "Product 5",
    "seller_name": "Sellar E",
    "stocks": 30,
    "category": [1, 4],
    "rank": 1,
    "main_image": "/images/img5.jpg",
    "image_path": ["/images/img5.jpg"],
    "summary": "This is product 5",
    "regist_day": new Date("2023-05-01"),
    "last_update": new Date("2023-05-05")
  }
]);

db.products_detail.insertMany([
  {
    "product_id": "p1001",
    "detail": "This is the detail infomation of product 1",
    "reputation": [
      {"star": 5, "comment": "Great"},
      {"star": 4, "comment": "good"}
    ]
  },
  {
    "product_id": "p1002",
    "detail": "This is the detail infomation of product 2",
    "reputation": [
      {"star": 3, "comment": "so so"}
    ]
  },
  {
    "product_id": "p1003",
    "detail": "This is the detail infomation of product 3",
   "reputation": [
      {"star": 3, "comment": "not bad"}
    ]
  },
  {
    "product_id": "p1004",
    "detail": "This is the detail infomation of product 4",
   "reputation": [
      {"star": 3, "comment": "well"}
    ]
  },
    {
    "product_id": "p1005",
    "detail": "This is the detail infomation of product 5",
   "reputation": [
      {"star": 3, "comment": "average"}
    ]
  },
  ]);

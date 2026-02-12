package model

import "time"

// JSON in Redis
type RedisCart struct {
	UpdatedAt time.Time       `json:"updated_at"`
	Cart      []RedisCartItem `json:"cart"`
}

type RedisCartItem struct {
	ProductID    string    `json:"product_id"`
	Quantity     int       `json:"quantity"`
	AddedAt      time.Time `json:"added_at"`
	ID           string    `json:"id"`
	ShippingFee  float64   `json:"shipping_fee"`
	ShippingType string    `json:"shipping_type"`
	ShippingDays int       `json:"shipping_days"`
}

// For DB (product table)
type Product struct {
	ProductID        string    `db:"product_id"`
	ProductName      string    `db:"product_name"`
	SellerID         string    `db:"seller_id"`
	Price            int       `db:"price"`
	CategoryID       string    `db:"category_id"`
	Summary          string    `db:"summary"`
	ProductCondition string    `db:"product_condition"`
	GeoID            string    `db:"geo_id"`
	RegistDay        time.Time `db:"regist_day"`
	LastUpdate       time.Time `db:"last_update"`
}

// For API response (image URL is built in the frontend)
type ProductDTO struct {
	ProductID        string    `json:"product_id"`
	ProductName      string    `json:"product_name"`
	SellerID         string    `json:"seller_id"`
	Price            int       `json:"price"`
	CategoryID       string    `json:"category_id"`
	Summary          string    `json:"summary"`
	ProductCondition string    `json:"product_condition"`
	GeoID            string    `json:"geo_id"`
	RegistDay        time.Time `json:"regist_day"`
	LastUpdate       time.Time `json:"last_update"`
}

type CartViewItem struct {
	ID           string     `json:"id"`
	Product      ProductDTO `json:"product"`
	Quantity     int        `json:"quantity"`
	AddedAt      time.Time  `json:"added_at"`
	ShippingFee  float64    `json:"shipping_fee"`
	ShippingType string     `json:"shipping_type"`
	ShippingDays int        `json:"shipping_days"`
}

type CartView struct {
	UpdatedAt time.Time      `json:"updated_at"`
	Items     []CartViewItem `json:"items"`
}

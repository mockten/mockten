package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
)

type Product struct {
	ProductID   string   `json:"product_id"`
	ProductName string   `json:"product_name"`
	SellerName  string   `json:"seller_name"`
	Stocks      int      `json:"stocks"`
	Category    []int    `json:"category"`
	Rank        int      `json:"rank"`
	MainImage   string   `json:"main_image"`
	ImagePath   []string `json:"image_path"`
	Summary     string   `json:"summary"`
	RegistDay   string   `json:"regist_day"`
	LastUpdate  string   `json:"last_update"`
}

type ResponseItem struct {
	ProductID   string `json:"product_id"`
	ProductName string `json:"product_name"`
	SellerName  string `json:"seller_name"`
	Category    int    `json:"category"`
	Price       int    `json:"price"`
	Ranking     int    `json:"ranking"`
	Stocks      int    `json:"stocks"`
	MainURL     string `json:"main_url"`
}

type SearchResponse struct {
	Items []ResponseItem `json:"items"`
	Page  int            `json:"page"`
}

var products = []Product{
	{
		ProductID:   "p1001",
		ProductName: "Product1",
		SellerName:  "Seller A",
		Stocks:      50,
		Category:    []int{1, 3},
		Rank:        5,
		MainImage:   "/images/img1.jpg",
		ImagePath:   []string{"/images/img1.jpg"},
		Summary:     "This is product 1",
		RegistDay:   "2023-01-01",
		LastUpdate:  "2023-01-05",
	},
	{
		ProductID:   "p1002",
		ProductName: "Product2",
		SellerName:  "Seller B",
		Stocks:      20,
		Category:    []int{2, 4},
		Rank:        4,
		MainImage:   "/images/img2.jpg",
		ImagePath:   []string{"/images/img2.jpg"},
		Summary:     "This is product 2",
		RegistDay:   "2023-02-01",
		LastUpdate:  "2023-02-05",
	},
	{
		ProductID:   "p1003",
		ProductName: "Product3",
		SellerName:  "Seller C",
		Stocks:      75,
		Category:    []int{1, 5},
		Rank:        3,
		MainImage:   "/images/img3.jpg",
		ImagePath:   []string{"/images/img3.jpg"},
		Summary:     "This is product 3",
		RegistDay:   "2023-03-01",
		LastUpdate:  "2023-03-05",
	},
	{
		ProductID:   "p1004",
		ProductName: "Product4",
		SellerName:  "Seller D",
		Stocks:      100,
		Category:    []int{2, 3},
		Rank:        2,
		MainImage:   "/images/img4.jpg",
		ImagePath:   []string{"/images/img4.jpg"},
		Summary:     "This is product 4",
		RegistDay:   "2023-04-01",
		LastUpdate:  "2023-04-05",
	},
	{
		ProductID:   "p1005",
		ProductName: "Product5",
		SellerName:  "Seller E",
		Stocks:      30,
		Category:    []int{1, 4},
		Rank:        1,
		MainImage:   "/images/img5.jpg",
		ImagePath:   []string{"/images/img5.jpg"},
		Summary:     "This is product 5",
		RegistDay:   "2023-05-01",
		LastUpdate:  "2023-05-05",
	},
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	pageStr := r.URL.Query().Get("p")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	var responseItems []ResponseItem
	for _, product := range products {
		if strings.Contains(strings.ToLower(product.ProductName), strings.ToLower(query)) {
			for _, cat := range product.Category {
				responseItems = append(responseItems, ResponseItem{
					ProductID:   product.ProductID,
					ProductName: product.ProductName,
					SellerName:  product.SellerName,
					Category:    cat,
					Price:       100,
					Ranking:     product.Rank,
					Stocks:      product.Stocks,
					MainURL:     product.MainImage,
				})
				break
			}
		}
	}

	resp := SearchResponse{
		Items: responseItems,
		Page:  page,
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(resp); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func main() {
	http.HandleFunc("/v1/search", enableCORS(searchHandler))
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

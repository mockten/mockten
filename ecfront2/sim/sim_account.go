package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/google/uuid"
)

type MockSellerAccount struct {
	SellerID     string `json:"seller_id"`
	SellerName   string `json:"product_name"`
	MailAddress1 string `json:"seller_name"`
	MailAddress2 string `json:"seller_name"`
	PhoneNum1    string `json:"stocks"`
	PhoneNum2    string `json:"category"`
	PhoneNum3    string `json:"rank"`
	Address1     string `json:"price"`
	Address2     string `json:"main_image"`
	Address3     string `json:"image_path"`
	Image        string `json:"summary"`
	RegistDay    string `json:"regist_day"`
	LastUpdate   string `json:"last_update"`
	BirthDay     string
}

type MockUserAccount struct {
	UserID       string `json:"seller_id"`
	UserName     string `json:"product_name"`
	MailAddress1 string `json:"seller_name"`
	MailAddress2 string `json:"seller_name"`
	PhoneNum1    string `json:"stocks"`
	PhoneNum2    string `json:"category"`
	PhoneNum3    string `json:"rank"`
	Address1     string `json:"price"`
	Address2     string `json:"main_image"`
	Address3     string `json:"image_path"`
	Image        string `json:"summary"`
	RegistDay    string `json:"regist_day"`
	LastUpdate   string `json:"last_update"`
	BirthDay     string
}

type Product struct {
	ProductID   string   `json:"product_id"`
	ProductName string   `json:"product_name"`
	SellerName  string   `json:"seller_name"`
	Stocks      int      `json:"stocks"`
	Category    []int    `json:"category"`
	Rank        int      `json:"rank"`
	Price       int      `json:"price"`
	MainImage   string   `json:"main_image"`
	ImagePath   []string `json:"image_path"`
	Summary     string   `json:"summary"`
	RegistDay   string   `json:"regist_day"`
	LastUpdate  string   `json:"last_update"`
}

type MyCartItem struct {
	ProductID   string `json:"product_id"`
	ProductName string `json:"product_name"`
	SellerName  string `json:"seller_name"`
	Stocks      int    `json:"stocks"`
	Category    []int  `json:"category"`
	MainImage   string `json:"main_image"`
	Price       int    `json:"price"`
}

type MyCartItemAmount struct {
	Amount int
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

func getMySellerAccountHandler(w http.ResponseWriter, r *http.Request) {
	sellerID := r.URL.Query().Get("s")
	fmt.Println("SellerID:" + sellerID)

	sellerAccount := MockSellerAccount{
		SellerID:     createRandumUUID(),
		SellerName:   "Sample Seller User",
		MailAddress1: "sample@sample.com",
		MailAddress2: "",
		PhoneNum1:    "070-3521-9573",
		PhoneNum2:    "",
		PhoneNum3:    "",
		Address1:     "Tokyo-to",
		Address2:     "Suginami-ku",
		Address3:     "Takaido 3-5-21",
		Image:        "/images/img4.jpg",
		RegistDay:    "2023-05-01",
		LastUpdate:   "2023-05-01",
		BirthDay:     "2023-05-01",
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(sellerAccount); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func getMyCartHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("u")
	fmt.Println("UserID:" + userID)

	var responseMyCartList []MyCartItem
	for _, product := range products {
		responseMyCartList = append(responseMyCartList, MyCartItem{
			ProductID:   product.ProductID,
			ProductName: product.ProductName,
			SellerName:  product.SellerName,
			Category:    product.Category,
			Price:       product.Price,
			Stocks:      product.Stocks,
			MainImage:   product.MainImage,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(responseMyCartList); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func getMyCartAmountHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("u")
	fmt.Println("UserID:" + userID)

	myCartItemAmount := MyCartItemAmount{
		Amount: len(products),
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(myCartItemAmount); err != nil {
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

func createRandumUUID() string {
	newUUID := uuid.New()
	uuidString := newUUID.String()
	return uuidString
}

func main() {
	http.HandleFunc("/v1/cart/list", enableCORS(getMyCartHandler))
	http.HandleFunc("v1/cart/amount", enableCORS(getMyCartHandler))
	http.HandleFunc("v1/seller", enableCORS(getMyCartHandler))
	if err := http.ListenAndServe(":8080", nil); err != nil {
		panic(err)
	}
}

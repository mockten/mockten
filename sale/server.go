package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	meilisearch "github.com/meilisearch/meilisearch-go"
)

var (
	db          *sql.DB
	meiliclient *meilisearch.Client
)

type TimeSale struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	StartDate    time.Time `json:"start_date"`
	EndDate      time.Time `json:"end_date"`
	DiscountRate float64   `json:"discount_rate"`
}

type ProductItem struct {
	ProductID    string  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	SellerName   string  `json:"seller_name"`
	Price        int     `json:"price"`
	Stocks       int     `json:"stocks"`
	AvgReview    float64 `json:"avg_review"`
	ReviewCount  int     `json:"review_count"`
	Condition    string  `json:"condition"`
	CategoryName string  `json:"category_name"`
	SaleFlag     bool    `json:"sale_flag"`
	SaleID       string  `json:"sale_id"`
	DiscountRate float64 `json:"discount_rate"`
}

func main() {
	var err error

	// Database setup
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	}
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to connect to MySQL: %v", err)
	}
	defer db.Close()

	// Wait for MySQL to be ready
	for i := 0; i < 30; i++ {
		if err := db.Ping(); err == nil {
			log.Println("MySQL is ready")
			break
		}
		log.Println("Waiting for MySQL...")
		time.Sleep(1 * time.Second)
	}

	// MeiliSearch setup
	meiliHost := os.Getenv("MEILI_SVC")
	if meiliHost == "" {
		meiliHost = "meilisearch-service.default.svc.cluster.local"
	}
	meiliclient = meilisearch.NewClient(meilisearch.ClientConfig{
		Host: "http://" + meiliHost + ":7700",
	})

	r := gin.Default()

	// CORS config
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	r.GET("/api/sale/active", handleGetActiveSales)
	r.GET("/api/sale/products/random", handleGetRandomProducts)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Sale service on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

func handleGetActiveSales(c *gin.Context) {
	query := `SELECT id, name, start_date, end_date, discount_rate FROM TimeSale WHERE start_date <= NOW() AND end_date >= NOW()`
	rows, err := db.Query(query)
	if err != nil {
		log.Printf("failed to query active sales: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query database"})
		return
	}
	defer rows.Close()

	sales := []TimeSale{}
	for rows.Next() {
		var ts TimeSale
		if err := rows.Scan(&ts.ID, &ts.Name, &ts.StartDate, &ts.EndDate, &ts.DiscountRate); err != nil {
			log.Printf("failed to scan sale: %v", err)
			continue
		}
		sales = append(sales, ts)
	}

	c.JSON(http.StatusOK, sales)
}

func handleGetRandomProducts(c *gin.Context) {
	saleID := c.Query("sale_id")

	var filter string
	if saleID != "" {
		filter = fmt.Sprintf("sale_flag = true AND sale_id = \"%s\"", saleID)
	} else {
		filter = "sale_flag = true"
	}

	// Fetch from MeiliSearch
	searchRes, err := meiliclient.Index("products").Search(
		"*",
		&meilisearch.SearchRequest{
			Limit:  1000,
			Filter: filter,
		},
	)
	if err != nil {
		log.Printf("failed to query MeiliSearch: %v", err)
		c.JSON(http.StatusOK, gin.H{"items": []ProductItem{}, "total": 0})
		return
	}

	var items []ProductItem
	hitsJson, err := json.Marshal(searchRes.Hits)
	if err != nil {
		log.Printf("failed to marshal hits: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal JSON error"})
		return
	}
	if err := json.Unmarshal(hitsJson, &items); err != nil {
		log.Printf("failed to unmarshal items: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal unmarshal error"})
		return
	}

	// Retrieve discount rates from MySQL to build lookup map
	rows, err := db.Query("SELECT id, discount_rate FROM TimeSale")
	if err != nil {
		log.Printf("failed to query sale rates: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query database"})
		return
	}
	defer rows.Close()

	saleMap := make(map[string]float64)
	for rows.Next() {
		var id string
		var rate float64
		if err := rows.Scan(&id, &rate); err == nil {
			saleMap[id] = rate
		}
	}

	// Set discount rate for each product item
	for i := range items {
		if rate, ok := saleMap[items[i].SaleID]; ok {
			items[i].DiscountRate = rate
		}
	}

	// Randomly shuffle products
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(len(items), func(i, j int) {
		items[i], items[j] = items[j], items[i]
	})

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": len(items),
	})
}

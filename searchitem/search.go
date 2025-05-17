package main

import (
	"bufio"
	"fmt"
	"log"
	"net/http"
	"os"
	"encoding/json"
	"database/sql"
	"time"
	"strings"

	"github.com/gin-gonic/gin"
	meilisearch "github.com/meilisearch/meilisearch-go"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	_ "github.com/go-sql-driver/mysql"
)

const (
	port           = ":50051"
)

/*
type Item struct {
	ProductId   string    `json:"product_id"`
	ProductName string    `json:"product_name"`
	SellerName  string    `json:"seller_name"`
	Stocks      int       `json:"stocks"`
	Category    []int     `json:"category"`
	Rank        int       `json:"rank"`
	MainImage   string    `json:"main_image"`
	ImagePath   []string  `json:"image_path"`
	Summary     string    `json:"summary"`
	Price       int       `json:"price"`
	RegistDay   time.Time `json:"regist_day"`
	LastUpdate  time.Time `json:"last_update"`
}
	*/

type Item struct {
	ProductId   string    `json:"product_id"`
	ProductName string    `json:"product_name"`
	SellerName  string    `json:"seller_name"`
	Category    int       `json:"category"`
	Price       int       `json:"price"`
	Rank        int       `json:"ranking"`
	Stocks      int       `json:"stocks"`
	MainURL     string    `json:"main_url"`
}

type CategoryMap map[string]string


var (
	searchReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_req_total",
		Help: "Total number of requests that have come to search-item",
	})

	searchResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_res_total",
		Help: "Total number of response that send from serch-item",
	})

	logger      *zap.Logger
	meiliclient *meilisearch.Client
	categoryMap map[string]string
)

func LoadCategoryConfig(filepath string) (CategoryMap, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	categories := make(CategoryMap)

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		line = strings.TrimSpace(line)

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, ":", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid line format: %s", line)
		}

		code := strings.TrimSpace(parts[0])
		name := strings.TrimSpace(parts[1])
		categories[code] = name
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	return categories, nil
}


// Implement SearchItemServer using REST API
func searchHandler(c *gin.Context) {
	query := c.Query("q")
	page := c.Query("p")

	if query == "" || page == "" {
		logger.Error("Search Query parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no content"})
		return
	}

	// logging request log
	logger.Debug("Request log", zap.String("query", query), zap.String("page", page))

	// increment counter
	searchReqCount.Inc()

	searchRes, err := meiliclient.Index("products").Search(query,
		&meilisearch.SearchRequest{
			Limit: 25,
		})
	if err != nil {
		logger.Error("failed to search in some reasons.", zap.Error(err))
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no items"})
		return
	}

	logger.Debug("searchres:", zap.Any("searchres:", searchRes))

	var items []Item
    hitsJson, _ := json.Marshal(searchRes.Hits) // []interface{} → []byte
	json.Unmarshal(hitsJson, &items)      // []byte → []Book

	// increment counter
	searchResCount.Inc()

	logger.Debug("message", zap.Any("items", items))

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": page,
	})
}

type ProductDetail struct {
	ProductID   string    `json:"product_id"`
	ProductName string    `json:"product_name"`
	Price       int       `json:"price"`
	Category    int       `json:"category"`
	Summary     string    `json:"summary"`
	RegistDay   time.Time `json:"regist_day"`
	LastUpdate  time.Time `json:"last_update"`
	SellerName  string    `json:"seller_name"`
	Stocks      int       `json:"stocks"`
}

type ProductDetailResponse struct {
	ProductID    string    `json:"product_id"`
	ProductName  string    `json:"product_name"`
	Price        int       `json:"price"`
	CategoryName string    `json:"category"`
	Summary      string    `json:"summary"`
	RegistDay    time.Time `json:"regist_day"`
	LastUpdate   time.Time `json:"last_update"`
	SellerName   string    `json:"seller_name"`
	Stocks       int       `json:"stocks"`
}

func ConvertToResponse(detail *ProductDetail, categoryMap map[string]string) ProductDetailResponse {
	categoryKey := fmt.Sprintf("%02d", detail.Category)
	categoryName, ok := categoryMap[categoryKey]
	if !ok {
		categoryName = "Unknown"
	}

	return ProductDetailResponse{
		ProductID:    detail.ProductID,
		ProductName:  detail.ProductName,
		Price:        detail.Price,
		CategoryName: categoryName,
		Summary:      detail.Summary,
		RegistDay:    detail.RegistDay,
		LastUpdate:   detail.LastUpdate,
		SellerName:   detail.SellerName,
		Stocks:       detail.Stocks,
	}
}

func getItemDetailHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		productID := c.Query("id")
		
		if productID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing id parameter"})
			return
		}

		logger.Debug("Request log", zap.String("id", productID))

		query := `
			SELECT 
				p.product_id,
				p.product_name,
				p.price,
				p.category,
				p.summary,
				p.regist_day,
				p.last_update,
				s.seller_name,
				t.stocks
			FROM Product p
			JOIN Seller s ON p.seller_id = s.seller_id
			JOIN Stock t ON p.product_id = t.product_id
			WHERE p.product_id = ?
		`

		var detail ProductDetail
		err := db.QueryRow(query, productID).Scan(
			&detail.ProductID,
			&detail.ProductName,
			&detail.Price,
			&detail.Category,
			&detail.Summary,
			&detail.RegistDay,
			&detail.LastUpdate,
			&detail.SellerName,
			&detail.Stocks,
		)

		switch {
		case err == sql.ErrNoRows:
			// 400 error
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		case err != nil:
			logger.Error("DB Scan error: ", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		default:
			logger.Debug("No error scanning db")
		}

		responseJson := ConvertToResponse(&detail, categoryMap)
		c.JSON(http.StatusOK, responseJson)
	}
}

func main() {
	// set-up logging environment using zap
	var err error

	environment := os.Getenv("MOCKTEN_ENV")

	if environment == "development" || environment == "" {
		config := zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		logger, err = config.Build()
	} else {
		config := zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		logger, err = config.Build()
	}

	if err != nil {
		log.Println("failed to set-up zap log in searchitem. \n")
		panic(err)
	}

	logger.Debug("this is development environment.")
	logger.Info("success set-up logging function.")

	defer logger.Sync()

	// read config file
	jsonData, err := os.ReadFile("category.json")
	if err != nil {
		panic(err)
	}

	if err := json.Unmarshal(jsonData, &categoryMap); err != nil {
		panic(err)
	}

	// set-up meilisearch to register products json(documents) to index.
	meiliBackend := os.Getenv("MEILI_SVC")
	if meiliBackend == "" {
		logger.Error("does not exist MEILI_SVC.")
		meiliBackend = "meilisearch-service.default.svc.cluster.local"
	}

	meiliclient = meilisearch.NewClient(meilisearch.ClientConfig{
		// expect meilisearch sidecar container
		Host:   "http://" + meiliBackend + ":7700",
		// APIKey: os.Getenv("MEILISEARCH_MASTERKEY"),
	})

	dsn := "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.Error("can not connect to mysql.")
		log.Fatalf("DB open error: %v", err)
	}

	if err := db.Ping(); err != nil {
		log.Fatalf("DB connection failed: %v", err)
	}
	defer db.Close()


	// expose /metrics endpoint for observer(by default Prometheus).
	go exportMetrics()

	// start application
	router := gin.Default()
	router.GET("v1/search", searchHandler)
	router.GET("v1/item/detail", getItemDetailHandler(db))

	router.Run(port)

}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

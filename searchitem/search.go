package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	meilisearch "github.com/meilisearch/meilisearch-go"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

const (
	port = ":50051"
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
	ProductId   string `json:"product_id"`
	ProductName string `json:"product_name"`
	SellerName  string `json:"seller_name"`
	Category    int    `json:"category"`
	Price       int    `json:"price"`
	Rank        int    `json:"ranking"`
	Stocks      int    `json:"stocks"`
	MainURL     string `json:"main_url"`
}

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
)

// Implement SearchItemServer using REST API
func searchHandler(c *gin.Context) {
	query := c.Query("q")
	pageStr := c.Query("p")

	// status filter (optional)
	statusValues := c.QueryArray("status") // e.g. ["new","used"]

	if query == "" || pageStr == "" {
		logger.Error("Search Query parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no content"})
		return
	}

	logger.Debug("Request log", zap.String("query", query), zap.String("page", pageStr))

	searchReqCount.Inc()

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit := 20
	offset := (page - 1) * limit

	// build filter only when user selected status
	var filterExpr string
	if len(statusValues) > 0 {
		for i, s := range statusValues {
			if i == 0 {
				filterExpr += `condition = "` + s + `"`
			} else {
				filterExpr += ` OR condition = "` + s + `"`
			}
		}
	}

	searchRequest := &meilisearch.SearchRequest{
		Limit:  int64(limit),
		Offset: int64(offset),
	}

	if filterExpr != "" {
		searchRequest.Filter = filterExpr
	}

	searchRes, err := meiliclient.Index("products").Search(query, searchRequest)
	if err != nil {
		logger.Error("failed to search in some reasons.", zap.Error(err))
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no items"})
		return
	}

	logger.Debug("searchres:", zap.Any("searchres:", searchRes))

	var items []Item
	hitsJson, _ := json.Marshal(searchRes.Hits)
	json.Unmarshal(hitsJson, &items)

	searchResCount.Inc()

	logger.Debug("message", zap.Any("items", items))

	c.JSON(http.StatusOK, gin.H{
		"items": items,
		"total": searchRes.EstimatedTotalHits,
		"page":  page,
	})
}

type ProductDetail struct {
	ProductID    string    `json:"product_id"`
	ProductName  string    `json:"product_name"`
	Price        int       `json:"price"`
	CategoryID   string    `json:"category_id"`
	CategoryName string    `json:"category_name"`
	Summary      string    `json:"summary"`
	RegistDay    time.Time `json:"regist_day"`
	LastUpdate   time.Time `json:"last_update"`
	SellerName   string    `json:"seller_name"`
	Stocks       int       `json:"stocks"`
}

type ProductDetailResponse struct {
	ProductID    string    `json:"product_id"`
	ProductName  string    `json:"product_name"`
	Price        int       `json:"price"`
	CategoryName string    `json:"category"`
	CategoryID   string    `json:"category_id"`
	Summary      string    `json:"summary"`
	RegistDay    time.Time `json:"regist_day"`
	LastUpdate   time.Time `json:"last_update"`
	SellerName   string    `json:"seller_name"`
	Stocks       int       `json:"stocks"`
}

func ConvertToResponse(detail *ProductDetail) ProductDetailResponse {
	return ProductDetailResponse{
		ProductID:    detail.ProductID,
		ProductName:  detail.ProductName,
		Price:        detail.Price,
		CategoryName: detail.CategoryName,
		CategoryID:   detail.CategoryID,
		Summary:      detail.Summary,
		RegistDay:    detail.RegistDay,
		LastUpdate:   detail.LastUpdate,
		SellerName:   detail.SellerName,
		Stocks:       detail.Stocks,
	}
}

func waitForMySQL(db *sql.DB, logger *zap.Logger) {
	maxAttempts := 20
	for i := 1; i <= maxAttempts; i++ {
		err := db.Ping()
		if err == nil {
			logger.Info("MySQL is ready.")
			return
		}
		logger.Warn("Waiting for MySQL to be ready...", zap.Int("attempt", i), zap.Error(err))
		time.Sleep(3 * time.Second)
	}
	logger.Fatal("MySQL did not become ready in time.")
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
            c.category_id,
            c.category_name,
            p.summary,
            p.regist_day,
            p.last_update,
            t.stocks,
            ue.USERNAME AS seller_name
         FROM Product p
         JOIN Category c ON p.category_id = c.category_id
         JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
         JOIN USER_GROUP_MEMBERSHIP ugm ON ue.ID = ugm.USER_ID
         JOIN KEYCLOAK_GROUP kg ON ugm.GROUP_ID = kg.ID
         JOIN Stock t ON p.product_id = t.product_id
         WHERE p.product_id = ? AND kg.NAME = 'Seller'
      `
		var detail ProductDetail
		err := db.QueryRow(query, productID).Scan(
			&detail.ProductID,
			&detail.ProductName,
			&detail.Price,
			&detail.CategoryID,
			&detail.CategoryName,
			&detail.Summary,
			&detail.RegistDay,
			&detail.LastUpdate,
			&detail.Stocks,
			&detail.SellerName,
		)

		switch {
		case err == sql.ErrNoRows:
			c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		case err != nil:
			logger.Error("DB Scan error: ", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		default:
			logger.Debug("No error scanning db")
		}

		responseJson := ConvertToResponse(&detail)
		c.JSON(http.StatusOK, responseJson)
	}
}

func main() {
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
		log.Println("failed to set-up zap log in searchitem.")
		panic(err)
	}

	logger.Debug("this is development environment.")
	logger.Info("success set-up logging function.")

	defer logger.Sync()

	meiliBackend := os.Getenv("MEILI_SVC")
	if meiliBackend == "" {
		logger.Error("does not exist MEILI_SVC.")
		meiliBackend = "meilisearch-service.default.svc.cluster.local"
	}

	meiliclient = meilisearch.NewClient(meilisearch.ClientConfig{
		Host: "http://" + meiliBackend + ":7700",
	})

	dsn := "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		logger.Error("can not connect to mysql.")
		log.Fatalf("DB open error: %v", err)
	}
	waitForMySQL(db, logger)
	defer db.Close()

	go exportMetrics()

	router := gin.Default()
	router.GET("v1/search", searchHandler)
	router.GET("v1/item/detail", getItemDetailHandler(db))

	router.Run(port)
}

func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

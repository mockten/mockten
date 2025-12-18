package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
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

type Item struct {
	ProductId    string  `json:"product_id"`
	ProductName  string  `json:"product_name"`
	SellerName   string  `json:"seller_name"`
	Category     int     `json:"category"`
	Price        int     `json:"price"`
	Rank         int     `json:"ranking"`
	Stocks       int     `json:"stocks"`
	MainURL      string  `json:"main_url"`
	AvgReview    float64 `json:"avg_review"`
	ReviewCount  int     `json:"review_count"`
	Condition    string  `json:"condition"`
	CategoryName string  `json:"category_name"`
}

var (
	searchReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_req_total",
		Help: "Total number of requests that have come to search-item",
	})

	searchResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_res_total",
		Help: "Total number of response that send from search-item",
	})

	logger      *zap.Logger
	meiliclient *meilisearch.Client
)

func searchHandler(c *gin.Context) {
	query := c.Query("q")
	pageStr := c.Query("p")

	statusParams := c.QueryArray("status")
	categoryParams := c.QueryArray("category")
	stockParam := c.Query("stock")

	minPriceStr := c.Query("min_price")
	maxPriceStr := c.Query("max_price")
	minRatingStr := c.Query("min_rating")

	if query == "" || pageStr == "" {
		logger.Error("Search Query parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no content"})
		return
	}

	logger.Debug(
		"Request log",
		zap.String("query", query),
		zap.String("page", pageStr),
		zap.Strings("status", statusParams),
		zap.Strings("category", categoryParams),
		zap.String("stock", stockParam),
		zap.String("min_price", minPriceStr),
		zap.String("max_price", maxPriceStr),
		zap.String("min_rating", minRatingStr),
	)

	searchReqCount.Inc()

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit := 20
	offset := (page - 1) * limit

	var filters []string

	if len(statusParams) > 0 {
		var expr string
		for i, s := range statusParams {
			sn := strings.ToLower(strings.TrimSpace(s))
			if sn == "new" || sn == "used" {
				if i == 0 {
					expr = `condition = "` + sn + `"`
				} else {
					expr += ` OR condition = "` + sn + `"`
				}
				continue
			}
			if sn == "new" {
				if i == 0 {
					expr = `condition = "new"`
				} else {
					expr += ` OR condition = "new"`
				}
			} else if sn == "used" {
				if i == 0 {
					expr = `condition = "used"`
				} else {
					expr += ` OR condition = "used"`
				}
			} else {
				if i == 0 {
					expr = `condition = "` + sn + `"`
				} else {
					expr += ` OR condition = "` + sn + `"`
				}
			}
		}
		if expr != "" {
			filters = append(filters, expr)
		}
	}

	if len(categoryParams) > 0 {
		var expr string
		for i, cID := range categoryParams {
			if i == 0 {
				expr = `category_name = "` + cID + `"`
			} else {
				expr += ` OR category_name = "` + cID + `"`
			}
		}
		filters = append(filters, expr)
	}

	if stockParam == "1" {
		filters = append(filters, "stocks > 0")
	}

	if minPriceStr != "" {
		if v, err := strconv.Atoi(minPriceStr); err == nil {
			filters = append(filters, "price >= "+strconv.Itoa(v))
		}
	}

	if maxPriceStr != "" {
		if v, err := strconv.Atoi(maxPriceStr); err == nil {
			filters = append(filters, "price <= "+strconv.Itoa(v))
		}
	}

	if minRatingStr != "" {
		if v, err := strconv.ParseFloat(minRatingStr, 64); err == nil {
			filters = append(filters, "avg_review >= "+strconv.FormatFloat(v, 'f', -1, 64))
		}
	}

	var finalFilter interface{}
	if len(filters) == 1 {
		finalFilter = filters[0]
	} else if len(filters) > 1 {
		finalFilter = filters
	}

	searchRes, err := meiliclient.Index("products").Search(
		query,
		&meilisearch.SearchRequest{
			Limit:  int64(limit),
			Offset: int64(offset),
			Filter: finalFilter,
		},
	)
	if err != nil {
		logger.Error("failed to search in MeiliSearch.", zap.Error(err))
		c.JSON(http.StatusNoContent, gin.H{"message": "There is no items"})
		return
	}

	var items []Item
	hitsJson, _ := json.Marshal(searchRes.Hits)
	_ = json.Unmarshal(hitsJson, &items)

	searchResCount.Inc()

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
	AvgReview    float64   `json:"avg_review"`
	ReviewCount  int       `json:"review_count"`
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
	AvgReview    float64   `json:"avg_review"`
	ReviewCount  int       `json:"review_count"`
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
		AvgReview:    detail.AvgReview,
		ReviewCount:  detail.ReviewCount,
	}
}

type Category struct {
	CategoryID   string `json:"category_id"`
	CategoryName string `json:"category_name"`
}

func getCategoryListHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		rows, err := db.Query(`
			SELECT category_id, category_name
			FROM Category
			ORDER BY category_id
		`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
			return
		}
		defer rows.Close()

		var categories []Category
		for rows.Next() {
			var cat Category
			if err := rows.Scan(&cat.CategoryID, &cat.CategoryName); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan category"})
				return
			}
			categories = append(categories, cat)
		}

		c.JSON(http.StatusOK, categories)
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
            ue.USERNAME AS seller_name,
            p.avg_review,
            p.review_count
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
			&detail.AvgReview,
			&detail.ReviewCount,
		)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			}
			return
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

	defer logger.Sync()

	meiliBackend := os.Getenv("MEILI_SVC")
	if meiliBackend == "" {
		meiliBackend = "meilisearch-service.default.svc.cluster.local"
	}

	meiliclient = meilisearch.NewClient(meilisearch.ClientConfig{
		Host: "http://" + meiliBackend + ":7700",
	})

	dsn := "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}
	waitForMySQL(db, logger)
	defer db.Close()

	go exportMetrics()

	router := gin.Default()
	router.GET("v1/search", searchHandler)
	router.GET("v1/categories", getCategoryListHandler(db))
	router.GET("v1/item/detail", getItemDetailHandler(db))

	router.Run(port)
}

func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

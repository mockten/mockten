package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/go-redis/redis/v8"
	_ "github.com/go-sql-driver/mysql"
)

var (
	ctx = context.Background()
	rdb *redis.Client
	db  *sql.DB
)

type RankingItem struct {
	ProductID   string  `json:"product_id"`
	Score       int     `json:"score"`
	ProductName string  `json:"product_name"`
	Image       string  `json:"image"`
	Summary     string  `json:"summary"`
	Price       float64 `json:"price"`
	Rating      float64 `json:"rating"`
}

type RankingResponse struct {
	RankingMonth string        `json:"ranking_month"`
	Category     int           `json:"category"`
	Ranking      []RankingItem `json:"ranking"`
}

type UpdateRankingRequest struct {
	ProductID  string `json:"product_id"`
	CategoryID int    `json:"category_id"`
	Quantity   int    `json:"quantity"`
}

func main() {
	var err error

	// Redis setup
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "localhost:6379"
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")
	if redisPassword == "" {
		redisPassword = "mocktenpass"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr:     redisHost,
		Password: redisPassword,
	})

	// MySQL setup
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		// Mock default for development
		dsn = "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	}
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("failed to connect to MySQL: %v", err)
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	defer db.Close()

	r := gin.Default()

	// CORS config
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	r.GET("/api/ranking", handleGetRanking)
	r.POST("/api/ranking/update", handleUpdateRanking)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Ranking service on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

func handleGetRanking(c *gin.Context) {
	categoryStr := c.DefaultQuery("category", "all")
	month := time.Now().Format("2006-01")

	var zsetKey string
	var categoryID int
	if categoryStr == "all" {
		zsetKey = fmt.Sprintf("ranking:%s:all", month)
		categoryID = 99
	} else {
		zsetKey = fmt.Sprintf("ranking:%s:%s", month, categoryStr)
		id, _ := strconv.Atoi(categoryStr)
		categoryID = id
	}

	// Get top 10 products from Redis
	res, err := rdb.ZRevRangeWithScores(ctx, zsetKey, 0, 9).Result()
	if err != nil {
		log.Printf("failed to fetch ranking from redis: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch ranking"})
		return
	}

	rankingItems := []RankingItem{}
	for _, z := range res {
		productID := z.Member.(string)
		score := int(z.Score)

		// Fetch metadata from MySQL
		var name, summary string
		var price float64
		var rating float64
		err := db.QueryRow("SELECT product_name, summary, price, avg_review FROM Product WHERE product_id = ?", productID).Scan(&name, &summary, &price, &rating)
		if err != nil {
			log.Printf("failed to fetch product info for %s: %v", productID, err)
			continue
		}

		// Image URL from storage API
		image := fmt.Sprintf("/api/storage/%s.png", productID) 

		rankingItems = append(rankingItems, RankingItem{
			ProductID:   productID,
			Score:       score,
			ProductName: name,
			Image:       image,
			Summary:     summary,
			Price:       price,
			Rating:      rating,
		})
	}

	c.JSON(http.StatusOK, RankingResponse{
		RankingMonth: month, // requested field name
		Category:     categoryID,
		Ranking:      rankingItems,
	})
}

func handleUpdateRanking(c *gin.Context) {
	var req UpdateRankingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	month := time.Now().Format("2006-01")
	zsetKey := fmt.Sprintf("ranking:%s:%d", month, req.CategoryID)
	allKey := fmt.Sprintf("ranking:%s:all", month)

	rdb.ZIncrBy(ctx, zsetKey, float64(req.Quantity), req.ProductID)
	rdb.ZIncrBy(ctx, allKey, float64(req.Quantity), req.ProductID)

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

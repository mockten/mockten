package main

import (
	"log"
	"net/http"
	"os"
	"encoding/json"
	// "time"

	"github.com/gin-gonic/gin"
	meilisearch "github.com/meilisearch/meilisearch-go"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
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

	// set-up meilisearch to register products json(documents) to index.
	meiliBackend := os.Getenv("MEILI_SVC")
	if meiliBackend == "" {
		logger.Error("does not exist MEILI_SVC.")
		meiliBackend = "127.0.0.1"
	}

	meiliclient = meilisearch.NewClient(meilisearch.ClientConfig{
		// expect meilisearch sidecar container
		Host:   "http://" + meiliBackend + ":7700",
		// APIKey: os.Getenv("MEILISEARCH_MASTERKEY"),
	})


	// expose /metrics endpoint for observer(by default Prometheus).
	go exportMetrics()

	// start application
	router := gin.Default()
	router.GET("v1/search", searchHandler)
	router.Run(port)

}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

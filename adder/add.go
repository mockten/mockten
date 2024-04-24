package main

import (
	"context"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"time"

	"cloud.google.com/go/storage"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
)

const (
	port       = ":50051"
	bucketName = "images"
)

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

var (
	addItemReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "add_item_req_total",
		Help: "Total number of requests that have come to add-item",
	})

	addItemResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "add_item_res_total",
		Help: "Total number of response that send from add-item",
	})

	logger     *zap.Logger
	collection *mongo.Collection
	bucket     *storage.BucketHandle
)

// Implement SearchItemServer using REST API
func addItemHandler(c *gin.Context) {
	productName := c.PostForm("product_name") // string
	sellerName := c.PostForm("seller_name")   // string
	category := c.PostForm("category")        // number
	price := c.PostForm("price")              // number
	stock := c.PostForm("stock")              // number
	token := c.PostForm("token")              // token

	logger.Debug("Request Add Item log",
		zap.String("productName", productName),
		zap.String("sellerName", sellerName),
		zap.String("category", category),
		zap.String("price", price),
		zap.String("stock", stock),
		zap.String("token", token))

	// increment counter
	addItemReqCount.Inc()

	if productName == "" {
		logger.Error("AddItem productName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if sellerName == "" {
		logger.Error("AddItem sellerName parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if category == "" {
		logger.Error("AddItem category parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if price == "" {
		logger.Error("AddItem price parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if stock == "" {
		logger.Error("AddItem stock parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}
	if token == "" {
		logger.Error("AddItem token parameter is missing.")
		c.JSON(http.StatusNoContent, gin.H{"message": "Parameter missing"})
		return
	}

	// manipulate main image
	mainImage, err := c.FormFile("file") // []byte
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save the image file on GCS
	ctx := context.Background()
	gcsFilePath := bucketName + "/" + sellerName + "/" + mainImage.Filename
	logger.Debug("gcs file path:", zap.String("gcsFilePath", gcsFilePath))
	wc := bucket.Object(gcsFilePath).NewWriter(ctx)
	mainImageReader, err := FileHeaderToReader(mainImage)

	if _, err := io.Copy(wc, mainImageReader); err != nil {
		logger.Error("Failed to upload file to GCS:", zap.Error(err))
	}
	if err := wc.Close(); err != nil {
		logger.Error("Failed to close GCS writer:", zap.Error(err))
		c.JSON(http.StatusNotFound, "error")

	}

	// Save the item data on MongoDB
	numStock, err := strconv.Atoi(stock)
	if err != nil {
		logger.Error("convert error with stock value:", zap.Error(err))
		return
	}

	numCategory, err := strconv.Atoi(category)
	if err != nil {
		logger.Error("convert error with category value:", zap.Error(err))
		return
	}

	numPrice, err := strconv.Atoi(price)
	if err != nil {
		logger.Error("convert error with price value:", zap.Error(err))
		return
	}

	item := Item{ProductId: "hogehoge",
		ProductName: productName,
		SellerName:  sellerName,
		Stocks:      numStock,
		Category:    []int{numCategory},
		Rank:        99999,
		MainImage:   gcsFilePath,
		Summary:     "test item",
		Price:       numPrice,
		RegistDay:   time.Now(),
		LastUpdate:  time.Now(),
	}

	_, err = collection.InsertOne(ctx, item)
	if err != nil {
		logger.Error("failed to add item to mongo", zap.Error(err))
		c.JSON(http.StatusNotFound, "error")
	}

	// increment counter
	addItemResCount.Inc()

	c.JSON(http.StatusOK, "OK")
}

func FileHeaderToReader(fh *multipart.FileHeader) (io.Reader, error) {
	// open
	file, err := fh.Open()
	if err != nil {
		return nil, err
	}
	// 関数の終了時にファイルを閉じる
	defer file.Close()
	// ファイルを io.Reader に変換して返す
	return file, nil
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

	// set-up MongoDB client
	mongoHost := os.Getenv("MONGO_SVC_SERVICE_HOST")
	mongoPort := os.Getenv("MONGO_SVC_SERVICE_PORT")
	mongoPass := os.Getenv("MONGO_INITDB_ROOT_PASSWORD")
	mongoUser := os.Getenv("MONGO_INITDB_ROOT_USERNAME")

	if mongoHost == "" {
		logger.Error("does not exist remote mongo host.")
		mongoHost = "localhost"
	}
	if mongoPort == "" {
		logger.Error("does not exist remote mongo port.")
		mongoPort = "27017"
	}
	if mongoPass == "" {
		logger.Error("does not exist remote mongo password.")
		mongoPass = "bar"
	}
	if mongoUser == "" {
		logger.Error("does not exist remote mongo username.")
		mongoUser = "bar"
	}

	remoteMongoHost := "mongodb://" + mongoUser + ":" + mongoPass + "@" + mongoHost + ":" + mongoPort
	client, err := mongo.NewClient(options.Client().ApplyURI(remoteMongoHost))
	if err != nil {
		logger.Error("does not exist remote mongo host.")
		panic(err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	err = client.Connect(ctx)
	if err != nil {
		logger.Error("unexpected error occur when connect to mongo.")
		panic(err)
	}
	defer client.Disconnect(ctx)

	mongoUserDb := os.Getenv("MONGO_USER_DB_NAME")
	mongoUserCollection := os.Getenv("MONGO_USER_COLLECTION_NAME")
	if mongoHost == "" {
		logger.Error("does not exist MONGO_USER_DB_NAME.")
		mongoUserDb = "product_info"
	}
	if mongoPort == "" {
		logger.Error("does not exist MONGO_USER_COLLECTION_NAME.")
		mongoUserCollection = "products"
	}

	collection = client.Database(mongoUserDb).Collection(mongoUserCollection)

	// Create GCS client
	gcsClient, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatalf("Failed to create GCS client: %v", err)
	}
	defer gcsClient.Close()

	// Get bucket object
	bucket = gcsClient.Bucket(bucketName)

	// expose /metrics endpoint for observer(by default Prometheus).
	go exportMetrics()

	// start application
	router := gin.Default()
	router.POST("v1/seller/add", addItemHandler)
	router.Run(port)

}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

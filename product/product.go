package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"go.uber.org/zap"
)

const (
	port = ":50052"
)

var (
	logger *zap.Logger
)

type GeoResponse struct {
	GeoID        string   `json:"geoId"`
	CountryCode  string   `json:"countryCode"`
	PostalCode   string   `json:"postalCode"`
	Prefecture   string   `json:"prefecture"`
	City         string   `json:"city"`
	Town         string   `json:"town"`
	BuildingName string   `json:"buildingName"`
	RoomNumber   string   `json:"roomNumber"`
	Latitude     *float64 `json:"latitude"`
	Longitude    *float64 `json:"longitude"`
}

type ItemDetailResponse struct {
	ProductID        string      `json:"productId"`
	ProductName      string      `json:"productName"`
	SellerName       string      `json:"sellerName"`
	Price            int         `json:"price"`
	CategoryName     string      `json:"categoryName"`
	ProductCondition string      `json:"productCondition"`
	InStock          bool        `json:"inStock"`
	Stocks           int         `json:"stocks"`
	Summary          string      `json:"summary"`
	Geo              GeoResponse `json:"geo"`
	RegistDay        time.Time   `json:"registDay"`
	LastUpdate       time.Time   `json:"lastUpdate"`
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
		productID := c.Param("productId")
		if productID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing productId path parameter"})
			return
		}

		query := `
SELECT
  p.product_id,
  p.product_name,
  COALESCE(s.seller_name, ue.USERNAME) AS seller_name,
  p.price,
  c.category_name,
  p.product_condition,
  COALESCE(t.stocks, 0) AS stocks,
  p.summary,
  p.regist_day,
  p.last_update,
  p.geo_id,
  g.country_code,
  g.postal_code,
  g.prefecture,
  g.city,
  g.town,
  g.building_name,
  g.room_number,
  g.latitude,
  g.longitude
FROM Product p
JOIN Category c ON p.category_id = c.category_id
LEFT JOIN Stock t ON p.product_id = t.product_id
LEFT JOIN Seller s ON p.seller_id = s.seller_id
LEFT JOIN USER_ENTITY ue ON p.seller_id = ue.EMAIL
LEFT JOIN Geo g ON p.geo_id = g.user_id
WHERE p.product_id = ?
LIMIT 1
`

		var (
			resp ItemDetailResponse

			geoID string

			countryCode  sql.NullString
			postalCode   sql.NullString
			prefecture   sql.NullString
			city         sql.NullString
			town         sql.NullString
			buildingName sql.NullString
			roomNumber   sql.NullString
			latitude     sql.NullFloat64
			longitude    sql.NullFloat64
		)

		err := db.QueryRow(query, productID).Scan(
			&resp.ProductID,
			&resp.ProductName,
			&resp.SellerName,
			&resp.Price,
			&resp.CategoryName,
			&resp.ProductCondition,
			&resp.Stocks,
			&resp.Summary,
			&resp.RegistDay,
			&resp.LastUpdate,
			&geoID,
			&countryCode,
			&postalCode,
			&prefecture,
			&city,
			&town,
			&buildingName,
			&roomNumber,
			&latitude,
			&longitude,
		)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
				return
			}
			logger.Error("DB query failed", zap.Error(err))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			return
		}

		resp.InStock = resp.Stocks > 0

		resp.Geo = GeoResponse{
			GeoID:        geoID,
			CountryCode:  "",
			PostalCode:   "",
			Prefecture:   "",
			City:         "",
			Town:         "",
			BuildingName: "",
			RoomNumber:   "",
			Latitude:     nil,
			Longitude:    nil,
		}

		if countryCode.Valid {
			resp.Geo.CountryCode = countryCode.String
		}
		if postalCode.Valid {
			resp.Geo.PostalCode = postalCode.String
		}
		if prefecture.Valid {
			resp.Geo.Prefecture = prefecture.String
		}
		if city.Valid {
			resp.Geo.City = city.String
		}
		if town.Valid {
			resp.Geo.Town = town.String
		}
		if buildingName.Valid {
			resp.Geo.BuildingName = buildingName.String
		}
		if roomNumber.Valid {
			resp.Geo.RoomNumber = roomNumber.String
		}
		if latitude.Valid {
			v := latitude.Float64
			resp.Geo.Latitude = &v
		}
		if longitude.Valid {
			v := longitude.Float64
			resp.Geo.Longitude = &v
		}

		c.JSON(http.StatusOK, resp)
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
		log.Println("failed to set up zap logger.")
		panic(err)
	}

	defer logger.Sync()

	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		dsn = "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	}

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}

	waitForMySQL(db, logger)
	defer db.Close()

	router := gin.Default()

	router.GET("/v1/item/detail/:productId", getItemDetailHandler(db))

	router.Run(port)
}

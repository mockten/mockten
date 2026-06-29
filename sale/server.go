package main

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"strings"
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
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)
	db.SetConnMaxLifetime(5 * time.Minute)
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

	// Seller Portal API
	r.GET("/v1/seller/stats", handleSellerStats)
	r.GET("/v1/seller/orders", handleSellerOrders)
	r.GET("/v1/seller/products", handleSellerProducts)
	r.PUT("/v1/seller/products/:id", handleUpdateProduct)
	r.DELETE("/v1/seller/products/:id", handleDeleteProduct)
	r.GET("/v1/seller/profile", handleGetProfile)
	r.PUT("/v1/seller/profile", handleUpdateProfile)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Sale service on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}

// extractEmailFromJWT extracts the email claim from a JWT token without signature verification
func extractEmailFromJWT(c *gin.Context) (string, error) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		return "", fmt.Errorf("missing Authorization header")
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
		return "", fmt.Errorf("invalid Authorization header format")
	}
	tokenParts := strings.Split(parts[1], ".")
	if len(tokenParts) < 2 {
		return "", fmt.Errorf("invalid JWT format")
	}
	// Add padding if needed
	payload := tokenParts[1]
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}
	decoded, err := base64.URLEncoding.DecodeString(payload)
	if err != nil {
		// Try StdEncoding as fallback
		decoded, err = base64.RawURLEncoding.DecodeString(tokenParts[1])
		if err != nil {
			return "", fmt.Errorf("failed to decode JWT payload: %v", err)
		}
	}
	var claims map[string]interface{}
	if err := json.Unmarshal(decoded, &claims); err != nil {
		return "", fmt.Errorf("failed to parse JWT claims: %v", err)
	}
	email, ok := claims["email"].(string)
	if !ok || email == "" {
		return "", fmt.Errorf("email claim not found in JWT")
	}
	return email, nil
}

func handleSellerStats(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	now := time.Now()
	// Current month: first day to now
	curStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	// Previous month
	prevEnd := curStart
	prevStart := time.Date(prevEnd.Year(), prevEnd.Month()-1, 1, 0, 0, 0, 0, prevEnd.Location())

	type PeriodStats struct {
		Revenue   float64
		Orders    int
		Products  int
		Customers int
	}

	getStats := func(start, end time.Time) (PeriodStats, error) {
		var ps PeriodStats
		query := `
			SELECT
				COALESCE(SUM(o.total_amount), 0) as revenue,
				COUNT(DISTINCT o.order_id) as orders,
				COUNT(DISTINCT t.product_id) as products,
				COUNT(DISTINCT o.user_id) as customers
			FROM ` + "`Order`" + ` o
			JOIN ` + "`Transaction`" + ` t ON JSON_CONTAINS(o.transactions_json, JSON_QUOTE(t.transaction_id))
			JOIN Product p ON t.product_id = p.product_id
			WHERE p.seller_id = ?
			  AND o.created_at >= ?
			  AND o.created_at < ?`
		row := db.QueryRow(query, sellerID, start, end)
		err := row.Scan(&ps.Revenue, &ps.Orders, &ps.Products, &ps.Customers)
		return ps, err
	}

	curStats, err := getStats(curStart, now.Add(24*time.Hour))
	if err != nil {
		log.Printf("failed to get current stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	prevStats, err := getStats(prevStart, prevEnd)
	if err != nil {
		log.Printf("failed to get prev stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	pctChange := func(cur, prev float64) interface{} {
		if prev == 0 {
			return nil
		}
		return (cur - prev) / prev * 100
	}

	c.JSON(http.StatusOK, gin.H{
		"current": gin.H{
			"revenue":   curStats.Revenue,
			"orders":    curStats.Orders,
			"products":  curStats.Products,
			"customers": curStats.Customers,
		},
		"previous": gin.H{
			"revenue":   prevStats.Revenue,
			"orders":    prevStats.Orders,
			"products":  prevStats.Products,
			"customers": prevStats.Customers,
		},
		"change": gin.H{
			"revenue":   pctChange(curStats.Revenue, prevStats.Revenue),
			"orders":    pctChange(float64(curStats.Orders), float64(prevStats.Orders)),
			"products":  pctChange(float64(curStats.Products), float64(prevStats.Products)),
			"customers": pctChange(float64(curStats.Customers), float64(prevStats.Customers)),
		},
	})
}

func handleSellerOrders(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	statusFilter := c.Query("status") // Pending, Processing, Completed, Canceled, All

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Map UI status to DB statuses
	var dbStatuses []string
	switch statusFilter {
	case "Pending":
		dbStatuses = []string{"created", "paid"}
	case "Processing":
		dbStatuses = []string{"picking", "shipped"}
	case "Completed":
		dbStatuses = []string{"delivered"}
	case "Canceled":
		dbStatuses = []string{"canceled", "refunded"}
	default:
		dbStatuses = []string{}
	}

	baseQuery := `
		SELECT DISTINCT o.order_id, o.user_id, o.total_amount, o.status, o.created_at
		FROM ` + "`Order`" + ` o
		JOIN ` + "`Transaction`" + ` t ON JSON_CONTAINS(o.transactions_json, JSON_QUOTE(t.transaction_id))
		JOIN Product p ON t.product_id = p.product_id
		WHERE p.seller_id = ?`

	args := []interface{}{sellerID}

	if len(dbStatuses) > 0 {
		placeholders := make([]string, len(dbStatuses))
		for i, s := range dbStatuses {
			placeholders[i] = "?"
			args = append(args, s)
		}
		baseQuery += " AND o.status IN (" + strings.Join(placeholders, ",") + ")"
	}

	// Count total
	countQuery := "SELECT COUNT(*) FROM (" + baseQuery + ") AS sub"
	var total int
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		log.Printf("failed to count orders: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	// Paginated query
	pagedQuery := baseQuery + " ORDER BY o.created_at DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := db.Query(pagedQuery, args...)
	if err != nil {
		log.Printf("failed to query orders: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	type OrderRow struct {
		OrderID   string  `json:"order_id"`
		UserID    string  `json:"user_id"`
		Amount    float64 `json:"amount"`
		Status    string  `json:"status"`
		CreatedAt string  `json:"created_at"`
	}

	var orders []OrderRow
	for rows.Next() {
		var o OrderRow
		var createdAt time.Time
		if err := rows.Scan(&o.OrderID, &o.UserID, &o.Amount, &o.Status, &createdAt); err != nil {
			continue
		}
		o.CreatedAt = createdAt.Format("2006-01-02 15:04:05")
		orders = append(orders, o)
	}
	if orders == nil {
		orders = []OrderRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"orders": orders,
		"total":  total,
		"page":   page,
		"limit":  limit,
	})
}

func handleSellerProducts(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	offset := (page - 1) * limit

	countRow := db.QueryRow("SELECT COUNT(*) FROM Product WHERE seller_id = ?", sellerID)
	var total int
	if err := countRow.Scan(&total); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	query := `
		SELECT p.product_id, p.product_name, p.price, p.product_condition, COALESCE(s.stocks, 0)
		FROM Product p
		LEFT JOIN Stock s ON p.product_id = s.product_id
		WHERE p.seller_id = ?
		ORDER BY p.product_name
		LIMIT ? OFFSET ?`

	rows, err := db.Query(query, sellerID, limit, offset)
	if err != nil {
		log.Printf("failed to query products: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}
	defer rows.Close()

	type ProductRow struct {
		ProductID   string `json:"product_id"`
		ProductName string `json:"product_name"`
		Price       int    `json:"price"`
		Condition   string `json:"condition"`
		Stocks      int    `json:"stocks"`
		Status      string `json:"status"`
	}

	var prods []ProductRow
	for rows.Next() {
		var p ProductRow
		if err := rows.Scan(&p.ProductID, &p.ProductName, &p.Price, &p.Condition, &p.Stocks); err != nil {
			continue
		}
		if p.Stocks == 0 {
			p.Status = "out of stock"
		} else if p.Stocks < 10 {
			p.Status = "low stock"
		} else {
			p.Status = "active"
		}
		prods = append(prods, p)
	}
	if prods == nil {
		prods = []ProductRow{}
	}

	c.JSON(http.StatusOK, gin.H{
		"products": prods,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

func handleUpdateProduct(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	productID := c.Param("id")
	var body struct {
		ProductName string `json:"product_name"`
		Price       int    `json:"price"`
		Summary     string `json:"summary"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	_, err = db.Exec(
		"UPDATE Product SET product_name=?, price=?, summary=? WHERE product_id=? AND seller_id=?",
		body.ProductName, body.Price, body.Summary, productID, sellerID,
	)
	if err != nil {
		log.Printf("failed to update product: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func handleDeleteProduct(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	productID := c.Param("id")
	_, err = db.Exec("DELETE FROM Product WHERE product_id=? AND seller_id=?", productID, sellerID)
	if err != nil {
		log.Printf("failed to delete product: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func handleGetProfile(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var sellerName string
	err = db.QueryRow("SELECT seller_name FROM Seller WHERE seller_id = ?", sellerID).Scan(&sellerName)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusOK, gin.H{"seller_id": sellerID, "seller_name": ""})
		return
	}
	if err != nil {
		log.Printf("failed to get profile: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"seller_id": sellerID, "seller_name": sellerName})
}

func handleUpdateProfile(c *gin.Context) {
	sellerID, err := extractEmailFromJWT(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var body struct {
		SellerName string `json:"seller_name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	_, err = db.Exec(
		"INSERT INTO Seller (seller_id, seller_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE seller_name = VALUES(seller_name)",
		sellerID, body.SellerName,
	)
	if err != nil {
		log.Printf("failed to update profile: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
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

package main

import (
	"bytes"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v74"
	"github.com/stripe/stripe-go/v74/customer"
	"github.com/stripe/stripe-go/v74/paymentintent"
	"github.com/stripe/stripe-go/v74/paymentmethod"
)

// Global DB connection pool — opened once at startup, reused across all handlers
var ecpayDB *sql.DB

func initDB() {
	dsn := fmt.Sprintf(MySQLHost, os.Getenv("MysqlUser"), os.Getenv("MysqlPassword"), os.Getenv("DbHost"), os.Getenv("MysqlDB"))
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("ecpay: db open error: %v", err)
	}
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	for i := 0; i < 30; i++ {
		if err = db.Ping(); err == nil {
			break
		}
		log.Printf("ecpay: waiting for db (%d/30)...", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("ecpay: db ping failed: %v", err)
	}
	ecpayDB = db
}

type PaymentMethodRequest struct {
	PaymentMethodID string `json:"payment_method_id"`
}

type CartItemReq struct {
	ProductID string `json:"product_id"`
	Quantity  int    `json:"quantity"`
}

type CheckoutRequest struct {
	PaymentMethodID string        `json:"payment_method_id"`
	Amount          int64         `json:"amount"` // typically calculated by backend but for mockup here
	Items           []CartItemReq `json:"items"`
}

type UserContext struct {
	UserID string
	Email  string
}

// Extract user details from Authorization Header token or fallback to mock
func getUser(c *gin.Context) UserContext {
	authHeader := c.GetHeader("Authorization")
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token := authHeader[7:]
		parts := strings.Split(token, ".")
		if len(parts) == 3 {
			// Base64 decode payload (parts[1])
			payload, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err == nil {
				var claims struct {
					Email             string `json:"email"`
					PreferredUsername string `json:"preferred_username"`
					Sub               string `json:"sub"`
				}
				if json.Unmarshal(payload, &claims) == nil {
					email := claims.Email
					if email == "" {
						email = claims.PreferredUsername + "@example.com"
					}
					userID := claims.Email
					if userID == "" {
						userID = claims.PreferredUsername
					}
					if userID == "" {
						userID = claims.Sub
					}
					if userID != "" {
						return UserContext{
							UserID: userID,
							Email:  email,
						}
					}
				}
			}
		}
	}

	// Fallback mock if no valid auth header
	return UserContext{
		UserID: "testuser@example.com",
		Email:  "testuser@example.com",
	}
}

func startHttpServer() {
	initDB()

	r := gin.Default()

	// CORS config
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	stripe.Key = os.Getenv("SecretKeyString")
	if stripe.Key == "" {
		// Mock config if not exists
		stripe.Key = "sk_test_mock"
	}

	r.POST("/api/payment-method", handleAddPaymentMethod)
	r.GET("/api/payment-method", handleGetPaymentMethods)
	r.PUT("/api/payment-method/default", handleSetDefaultPaymentMethod)
	r.DELETE("/api/payment-method", handleDeletePaymentMethod)
	r.POST("/api/payment", handleCreatePayment)

	log.Println("Starting Gin server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Gin fail: %v", err)
	}
}

func handleAddPaymentMethod(c *gin.Context) {
	var req PaymentMethodRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := getUser(c)

	db := ecpayDB
	var err error

	// 1. Get or create Customer
	var stripeCustomerID string
	err = db.QueryRow("SELECT stripe_customer_id FROM PaymentProfile WHERE user_id = ?", user.UserID).Scan(&stripeCustomerID)
	
	if err == sql.ErrNoRows {
		// Create Customer in Stripe
		params := &stripe.CustomerParams{
			Email: stripe.String(user.Email),
		}
		cus, err := customer.New(params)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create customer"})
			return
		}
		stripeCustomerID = cus.ID

		_, err = db.Exec("INSERT INTO PaymentProfile (user_id, stripe_customer_id) VALUES (?, ?)", user.UserID, stripeCustomerID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save profile"})
			return
		}
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db query error"})
		return
	}

	// 2. Attach PaymentMethod to Customer
	pmParams := &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(stripeCustomerID),
	}
	pm, err := paymentmethod.Attach(req.PaymentMethodID, pmParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to attach payment method: " + err.Error()})
		return
	}

	// 3. Save PaymentMethod to DB
	// Set all previous ones to false
	_, err = db.Exec("UPDATE PaymentMethod SET is_default = 0 WHERE user_id = ?", user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unset existing default cards"})
		return
	}

	pmID := uuid.New().String()
	_, err = db.Exec(`
		INSERT INTO PaymentMethod 
		(payment_method_id, user_id, stripe_customer_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default, status) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE status='active', is_default=1
	`, pmID, user.UserID, stripeCustomerID, pm.ID, pm.Card.Brand, pm.Card.Last4, pm.Card.ExpMonth, pm.Card.ExpYear, 1, "active")

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save payment method to db"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "payment_method_id": pmID})
}

func handleGetPaymentMethods(c *gin.Context) {
	user := getUser(c)

	db := ecpayDB
	var err error

	rows, err := db.Query(`
		SELECT payment_method_id, stripe_payment_method_id, brand, last4, exp_month, exp_year, is_default 
		FROM PaymentMethod 
		WHERE user_id = ? AND status = 'active'
		ORDER BY is_default DESC, created_at DESC
	`, user.UserID)
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "db query error"})
		return
	}
	defer rows.Close()

	var methods []map[string]interface{}
	for rows.Next() {
		var id, spmID, brand, last4 string
		var expMonth, expYear, isDefault int
		if err := rows.Scan(&id, &spmID, &brand, &last4, &expMonth, &expYear, &isDefault); err == nil {
			methods = append(methods, map[string]interface{}{
				"id": id,
				"stripe_payment_method_id": spmID,
				"brand": brand,
				"last4": last4,
				"exp_month": expMonth,
				"exp_year": expYear,
				"is_default": isDefault == 1,
			})
		}
	}

	c.JSON(http.StatusOK, methods)
}

type SetDefaultRequest struct {
	PaymentMethodID string `json:"payment_method_id"`
}

func handleSetDefaultPaymentMethod(c *gin.Context) {
	var req SetDefaultRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := getUser(c)

	db := ecpayDB
	var err error

	// Update all methods for this user to is_default = 0
	_, err = db.Exec("UPDATE PaymentMethod SET is_default = 0 WHERE user_id = ?", user.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to reset default flags"})
		return
	}

	// Set the selected method to is_default = 1
	result, err := db.Exec("UPDATE PaymentMethod SET is_default = 1 WHERE user_id = ? AND payment_method_id = ?", user.UserID, req.PaymentMethodID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set new default"})
		return
	}
	
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment method not found or already default"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

type DeletePaymentRequest struct {
	PaymentMethodID string `json:"payment_method_id"`
}

func handleDeletePaymentMethod(c *gin.Context) {
	var req DeletePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := getUser(c)

	db := ecpayDB
	var err error

	// Soft delete by updating status
	_, err = db.Exec(`
		UPDATE PaymentMethod SET status = 'inactive', is_default = 0
		WHERE user_id = ? AND payment_method_id = ?
	`, user.UserID, req.PaymentMethodID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete payment method"})
		return
	}

	// Optional: Select next available card to be default if needed
	// We'll leave it as no default until they add/set another

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}

func handleCreatePayment(c *gin.Context) {
	var req CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := getUser(c)

	db := ecpayDB
	var err error

	// Get specific payment method details
	var spmID, stripeCustomerID string
	err = db.QueryRow(`
		SELECT stripe_payment_method_id, stripe_customer_id 
		FROM PaymentMethod 
		WHERE payment_method_id = ? AND user_id = ?
	`, req.PaymentMethodID, user.UserID).Scan(&spmID, &stripeCustomerID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "payment method not found"})
		return
	}

	// Create PaymentIntent
	params := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(req.Amount * 100), // convert to cents assuming USD
		Currency:      stripe.String(string(stripe.CurrencyUSD)),
		PaymentMethod: stripe.String(spmID),
		Confirm:       stripe.Bool(true),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
			AllowRedirects: stripe.String("never"),
		},
	}
	if !strings.HasPrefix(stripeCustomerID, "cus_dev_") {
		params.Customer = stripe.String(stripeCustomerID)
	}
	pi, err := paymentintent.New(params)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "payment failed: " + err.Error()})
		return
	}

	var statusStr string
	switch pi.Status {
	case "succeeded":
		statusStr = "captured"
	case "requires_capture":
		statusStr = "authorized"
	case "canceled":
		statusStr = "canceled"
	default:
		statusStr = "failed"
	}

	paymentID := uuid.New().String()
	// Just mock order
	orderID := uuid.New().String()

	orderListJSON, _ := json.Marshal([]string{orderID})

	_, err = db.Exec(`
		INSERT INTO Payment (payment_id, order_id_list, payment_method_id, amount, currency, status, idempotency_key)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, paymentID, orderListJSON, req.PaymentMethodID, req.Amount, "USD", statusStr, pi.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record payment: " + err.Error()})
		return
	}

	if statusStr == "captured" || statusStr == "authorized" {
		for _, item := range req.Items {
			_, err := db.Exec("UPDATE Stock SET stocks = GREATEST(0, stocks - ?) WHERE product_id = ?", item.Quantity, item.ProductID)
			if err != nil {
				log.Printf("failed to decrement stock for product %s: %v", item.ProductID, err)
			}

			// Update ranking by calling Ranking service
			var categoryID int
			err = db.QueryRow("SELECT category_id FROM Product WHERE product_id = ?", item.ProductID).Scan(&categoryID)
			if err == nil {
				updateReq := map[string]interface{}{
					"product_id":  item.ProductID,
					"category_id": categoryID,
					"quantity":    item.Quantity,
				}
				jsonBody, _ := json.Marshal(updateReq)
				rankingURL := os.Getenv("RANKING_SERVICE_URL")
				if rankingURL == "" {
					rankingURL = "http://ranking-service:8080" // Default internal URL
				}
				resp, err := http.Post(rankingURL+"/api/ranking/update", "application/json", bytes.NewBuffer(jsonBody))
				if err != nil {
					log.Printf("failed to call ranking service: %v", err)
				} else {
					resp.Body.Close()
				}
			} else {
				log.Printf("failed to get category for ranking: %v", err)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "payment_intent_id": pi.ID, "payment_id": paymentID})
}

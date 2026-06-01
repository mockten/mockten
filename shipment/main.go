package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
)

var db *sql.DB

type ShipmentRequest struct {
	ProductID      string `json:"product_id"`
	GeoID          string `json:"geo_id"`
	ScheduledStart string `json:"scheduled_start"` // "YYYY-MM-DD HH:MM:SS", optional
}

type ShipmentResponse struct {
	TransactionID string `json:"transaction_id"`
	ProductID     string `json:"product_id"`
	ProductName   string `json:"product_name"`
	Status        string `json:"status"`
	PurchaseDate  string `json:"purchase_date"`
}

func initDB() {
	var err error
	dsn := "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	if envDSN := os.Getenv("MYSQL_DSN"); envDSN != "" {
		dsn = envDSN
	}

	for i := 0; i < 30; i++ {
		db, err = sql.Open("mysql", dsn)
		if err == nil {
			err = db.Ping()
			if err == nil {
				log.Println("Connected to MySQL database")
				break
			}
		}
		log.Printf("Waiting for database... (%d/30)\n", i+1)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto-migrate: add scheduled_start column if not exists using information_schema
	var exists bool
	err = db.QueryRow(`
		SELECT COUNT(*) > 0 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		  AND table_name = 'Transaction' 
		  AND column_name = 'scheduled_start'
	`).Scan(&exists)
	if err != nil {
		log.Printf("Migration warning: failed to query information_schema: %v", err)
	} else if !exists {
		_, err = db.Exec(`ALTER TABLE Transaction ADD COLUMN scheduled_start DATETIME NULL`)
		if err != nil {
			log.Printf("Migration error (adding scheduled_start): %v", err)
		} else {
			log.Println("Migration: scheduled_start column added successfully")
		}
	} else {
		log.Println("Migration: scheduled_start column already exists")
	}
}

func isTestMode() bool {
	return os.Getenv("TEST_MODE") == "true"
}

func startBackgroundWorker() {
	intervalStr := os.Getenv("TICK_INTERVAL_SECONDS")
	interval := 200 // default 200 seconds
	if intervalStr != "" {
		if parsed, err := strconv.Atoi(intervalStr); err == nil && parsed > 0 {
			interval = parsed
		}
	}

	ticker := time.NewTicker(time.Duration(interval) * time.Second)
	go func() {
		for range ticker.C {
			log.Println("Running status progression worker...")
			// Only advance statuses where scheduled_start has been reached (or is NULL for legacy rows)
			query := `
				UPDATE Transaction 
				SET status = CASE 
					WHEN status = 'in_transit' THEN 'delivered' 
					WHEN status = 'picked_up' THEN 'in_transit' 
					WHEN status = 'booked' THEN 'picked_up' 
					ELSE status 
				END,
				updated_at = NOW()
				WHERE status IN ('booked', 'picked_up', 'in_transit')
				  AND (scheduled_start IS NULL OR scheduled_start <= NOW())
			`
			res, err := db.Exec(query)
			if err != nil {
				log.Printf("Error updating transaction statuses: %v", err)
			} else {
				rowsAffected, _ := res.RowsAffected()
				log.Printf("Status progression complete. Rows affected: %d", rowsAffected)
			}
		}
	}()
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleShipment(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case "POST":
		var req ShipmentRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if req.ProductID == "" || req.GeoID == "" {
			http.Error(w, "product_id and geo_id are required", http.StatusBadRequest)
			return
		}

		transactionID := uuid.New().String()
		status := "booked"
		legType := "road"

		// Determine scheduled_start:
		// - TEST_MODE=true  → NULL (worker will process immediately on next tick)
		// - Otherwise       → use provided scheduled_start, or NULL if not provided
		var scheduledStart *string
		if !isTestMode() && req.ScheduledStart != "" {
			scheduledStart = &req.ScheduledStart
		}
		// In TEST_MODE, leave scheduledStart as nil → no restriction, worker runs immediately

		query := "INSERT INTO Transaction (transaction_id, product_id, geo_id, status, leg_type, scheduled_start) VALUES (?, ?, ?, ?, ?, ?)"
		_, err := db.Exec(query, transactionID, req.ProductID, req.GeoID, status, legType, scheduledStart)
		if err != nil {
			log.Printf("Error inserting transaction: %v", err)
			http.Error(w, "Failed to create shipment", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"transaction_id": transactionID,
			"status":         status,
		})

	case "GET":
		userID := r.URL.Query().Get("userId")
		if userID == "" {
			http.Error(w, "userId query parameter is required", http.StatusBadRequest)
			return
		}

		query := `
			SELECT t.transaction_id, t.product_id, p.product_name, t.status, DATE_FORMAT(t.created_at, '%M %e') as purchase_date
			FROM Transaction t
			JOIN Geo g ON t.geo_id = g.geo_id
			JOIN Product p ON t.product_id = p.product_id
			WHERE g.user_id = ?
			ORDER BY t.created_at DESC
		`

		rows, err := db.Query(query, userID)
		if err != nil {
			log.Printf("Error querying shipments: %v", err)
			http.Error(w, "Failed to retrieve shipments", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var shipments []ShipmentResponse
		for rows.Next() {
			var s ShipmentResponse
			if err := rows.Scan(&s.TransactionID, &s.ProductID, &s.ProductName, &s.Status, &s.PurchaseDate); err != nil {
				log.Printf("Error scanning row: %v", err)
				continue
			}
			shipments = append(shipments, s)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(shipments)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func main() {
	initDB()
	defer db.Close()

	startBackgroundWorker()

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/shipment", handleShipment)
	// healthcheck
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Shipment service starting on port %s (TEST_MODE=%v)", port, isTestMode())
	if err := http.ListenAndServe(":"+port, corsMiddleware(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/redis/go-redis/v9"

	"github.com/mockten/mockten/cart/internal/cartstore"
	ihttp "github.com/mockten/mockten/cart/internal/http"
	"github.com/mockten/mockten/cart/internal/productrepo"
	"github.com/mockten/mockten/cart/internal/service"
)

func mustGetenv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing env: %s", key)
	}
	return v
}

func getenvInt(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		log.Fatalf("invalid int env %s=%q: %v", key, v, err)
	}
	return n
}

func getenvDurationSeconds(key string, defSeconds int) time.Duration {
	sec := getenvInt(key, defSeconds)
	return time.Duration(sec) * time.Second
}

func main() {
	// ---- env ----
	// Example: user:pass@tcp(localhost:3306)/dbname?parseTime=true&charset=utf8mb4&loc=UTC
	mysqlDSN := mustGetenv("MYSQL_DSN")

	redisAddr := mustGetenv("REDIS_ADDR")
	redisPassword := os.Getenv("REDIS_PASSWORD")
	redisDB := getenvInt("REDIS_DB", 0)

	// 0 means no expiration
	cartTTL := getenvDurationSeconds("CART_TTL_SECONDS", 0)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// ---- MySQL ----
	db, err := sqlx.Open("mysql", mysqlDSN)
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatal(err)
	}
	log.Println("MySQL connected")

	// ---- Redis ----
	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
		DB:       redisDB,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		log.Fatal(err)
	}
	log.Println("Redis connected")

	// ---- DI ----
	cStore := cartstore.NewRedisCartStore(rdb, cartTTL)
	pRepo := productrepo.NewMySQLProductRepo(db)

	viewSvc := service.NewCartService(cStore, pRepo)
	h := ihttp.NewHandler(viewSvc, cStore)

	// ---- Router ----
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	ihttp.RegisterRoutes(r, h)

	// ---- HTTP server + graceful shutdown ----
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Println("cart-service listening on :" + port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_ = srv.Shutdown(ctx)
	_ = rdb.Close()
	_ = db.Close()
	log.Println("cart-service shutdown complete")
}

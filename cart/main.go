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

	commonauth "github.com/mockten/mockten/common/auth"
	"go.uber.org/zap"
)

const (
	port = "50053"
)

// func mustGetenv(key string) string {
// 	v := os.Getenv(key)
// 	if v == "" {
// 		log.Fatalf("missing env: %s", key)
// 	}
// 	return v
// }

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

func retry(logger *zap.Logger, name string, timeout time.Duration, sleep time.Duration, fn func() error) error {
	start := time.Now()
	for {
		err := fn()
		if err == nil {
			return nil
		}
		if time.Since(start) > timeout {
			return err
		}
		logger.Warn("failed to connect, retrying", zap.String("target", name), zap.Error(err))
		time.Sleep(sleep)
	}
}

func main() {
	var logger *zap.Logger
	var err error
	if os.Getenv("mockten_environment") == "production" {
		logger, err = zap.NewProduction()
	} else {
		logger, err = zap.NewDevelopment()
	}
	if err != nil {
		log.Fatal(err)
	}
	defer logger.Sync()
	zap.ReplaceGlobals(logger)

	retryTimeout := 10 * time.Minute
	retrySleep := 30 * time.Second

	var authn *commonauth.Authenticator
	if err := retry(logger, "authenticator", retryTimeout, retrySleep, func() error {
		var e error
		authn, e = commonauth.NewAuthenticatorFromEnv(commonauth.Options{Logger: logger})
		return e
	}); err != nil {
		logger.Fatal("failed to init authenticator", zap.Error(err))
	}
	defer authn.Close()

	// ---- env ----
	// Example: user:pass@tcp(localhost:3306)/dbname?parseTime=true&charset=utf8mb4&loc=UTC
	// mysqlDSN := mustGetenv("MYSQL_DSN")
	mysqlDSN := os.Getenv("MYSQL_DSN")
	if mysqlDSN == "" {
		mysqlDSN = "mocktenusr:mocktenpassword@tcp(mysql-service.default.svc.cluster.local:3306)/mocktendb?parseTime=true"
	}
	// redis-service.default.svc.cluster.local:6379
	// redisAddr := mustGetenv("REDIS_ADDR")
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "redis-service.default.svc.cluster.local:6379"
	}
	// mocktenpass
	redisPassword := os.Getenv("REDIS_PASSWORD")
	if redisPassword == "" {
		redisPassword = "mocktenpass"
	}
	redisDB := getenvInt("REDIS_DB", 0)

	// 0 means no expiration
	cartTTL := getenvDurationSeconds("CART_TTL_SECONDS", 0)

	// ---- MySQL ----
	var db *sqlx.DB
	if err := retry(logger, "mysql", retryTimeout, retrySleep, func() error {
		var e error
		db, e = sqlx.Open("mysql", mysqlDSN)
		if e != nil {
			return e
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(25)
		db.SetConnMaxLifetime(5 * time.Minute)
		return db.Ping()
	}); err != nil {
		logger.Fatal("failed to open/ping mysql", zap.Error(err))
	}
	logger.Info("MySQL connected")

	// ---- Redis ----
	var rdb *redis.Client
	if err := retry(logger, "redis", retryTimeout, retrySleep, func() error {
		rdb = redis.NewClient(&redis.Options{
			Addr:     redisAddr,
			Password: redisPassword,
			DB:       redisDB,
		})
		return rdb.Ping(context.Background()).Err()
	}); err != nil {
		logger.Fatal("failed to ping redis", zap.Error(err))
	}
	logger.Info("Redis connected")

	// ---- DI ----
	cStore := cartstore.NewRedisCartStore(rdb, cartTTL)
	pRepo := productrepo.NewMySQLProductRepo(db)

	viewSvc := service.NewCartService(cStore, pRepo)
	h := ihttp.NewHandler(viewSvc, cStore)

	// ---- Router ----
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	ihttp.RegisterRoutes(r, h, authn)

	// ---- HTTP server + graceful shutdown ----
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info("cart-service listening", zap.String("addr", port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("listen and serve failed", zap.Error(err))
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
	logger.Info("cart-service shutdown complete")
}

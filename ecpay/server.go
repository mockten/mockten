package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql" // registers the "mysql" sql driver used by api.go
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

const (
	LogFile = "/var/log/apl/apl.log"
	// MySQLHost is the DSN template used by the HTTP payment API (api.go).
	MySQLHost = "%v:%v@tcp(%v)/%v"
)

// exportMetrics serves Prometheus metrics on :9100 (run in a goroutine).
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	if err := http.ListenAndServe(":9100", nil); err != nil {
		log.Fatalf("metrics goroutine fail:%v", err)
	}
}

func init() {
	LoggingSettings(LogFile)
}

// LoggingSettings initializes logging to both stdout and a log file.
func LoggingSettings(logFile string) {
	logfile, _ := os.OpenFile(filepath.Clean(logFile), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0600)
	multiLogFile := io.MultiWriter(os.Stdout, logfile)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(multiLogFile)
}

func main() {
	// Expose Prometheus metrics.
	go exportMetrics()

	// Serve the payment REST API (Gin, :8080). Blocks.
	startHttpServer()
}

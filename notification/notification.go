package main

import (
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/yabamuro/gocelery"
	"gopkg.in/ini.v1"
)

const (
	InternalErrorCode = 500
	TaskName          = "worker.notification"
	LogFile           = "/var/log/apl/apl.log"
	TaskQueue         = "notification"
)

type ConfigList struct {
	FromUser       string
	FromUserName   string
	ToUserName     string
	Subject        string
	Concurrency    int
	OpeAddress     string
	OpinionSubject string
}

var Config ConfigList

var (
	celeryRcvNotificationReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_req_celery_notification",
			Help: "How many celery requests for sending notification.",
		},
		[]string{"code", "method"},
	)
)

func celeryRcvNotificationReqcount() {
	celeryRcvNotificationReqs.WithLabelValues("200", "GET").Add(1)
}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe(":9100", nil)
	if err != nil {
		log.Fatalf("metrics goroutine fail:%v", err)
	}
}

func init() {
	LoggingSettings(LogFile)
	cfg, err := ini.Load("config.ini")
	if err != nil {
		log.Fatalf("Initialization Error(Failed to read Config):%v", err)
		panic(err.Error())
	}
	Config = ConfigList{
		FromUser:       cfg.Section("api").Key("from_user").String(),
		FromUserName:   cfg.Section("api").Key("from_username").String(),
		ToUserName:     cfg.Section("api").Key("to_username").String(),
		Subject:        cfg.Section("api").Key("subject").String(),
		Concurrency:    cfg.Section("api").Key("concurrency").MustInt(),
		OpeAddress:     cfg.Section("api").Key("ope_address").String(),
		OpinionSubject: cfg.Section("api").Key("opinion_subject").String(),
	}
	prometheus.MustRegister(celeryRcvNotificationReqs)
}

func LoggingSettings(logFile string) {
	logfile, _ := os.OpenFile(filepath.Clean(logFile), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0600)
	multiLogFile := io.MultiWriter(os.Stdout, logfile)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(multiLogFile)
}

func sendMail(toAddress string, msg string) (responseCode int) {
	//DEBUG LOG
	celeryRcvNotificationReqcount()
	log.Printf("toAddress=%v, msg=%v\n", toAddress, msg)
	url := os.Getenv("SNS_URL")
	responseCode = InternalErrorCode
	if toAddress == os.Getenv("OPERATION_ADDRESS") {
		url += Config.OpinionSubject
	} else {
		url += Config.Subject
	}
	url += "&message=" + msg
	client := http.Client{}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header = http.Header{
		"x-api-key": []string{os.Getenv("SNS_API_KEY")},
	}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("SMS Send Error:%v", err)
		return responseCode
	}
	responseCode = resp.StatusCode
	return responseCode
}

func main() {
	// exec node-export service
	go exportMetrics()
	// App setting
	cli, _ := gocelery.NewCeleryClient(
		gocelery.NewRedisCeleryBroker(os.Getenv("REDIS_HOST"), TaskQueue),
		gocelery.NewRedisCeleryBackend(os.Getenv("REDIS_HOST")),
		Config.Concurrency,
	)
	cli.Register(TaskName, sendMail)
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	cli.StartWorker()
	defer cli.StopWorker()
	log.Printf("worker start: concurrency=%v on %v\n ", Config.Concurrency, os.Getenv("REDIS_HOST"))

	select {
	case sig := <-c:
		log.Println("worker stopped by signal:", sig)
		return
	}
}

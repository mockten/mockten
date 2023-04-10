package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"

	pb "github.com/mockten/mockten_interfaces/ranking"

	"github.com/gomodule/redigo/redis"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rung/go-safecast"
	"google.golang.org/grpc"
)

const (
	LogFile = "/var/log/apl/apl.log"
	Port    = "127.0.0.1:50053"
)

var (
	grpcRecvRankingReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_req_grpc_ranking",
			Help: "How many gRPC requests rcv from ecfront.",
		},
		[]string{"code", "method"},
	)
)
var (
	grpcSndRankingResps = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_resp_grpc_ranking",
			Help: "How many gRPC requests snd to ecfront.",
		},
		[]string{"code", "method"},
	)
)

func grpcRecvRankingReqcount() {
	grpcRecvRankingReqs.WithLabelValues("200", "GET").Add(1)
}
func grpcSndRankingRespcount() {
	grpcSndRankingResps.WithLabelValues("200", "GET").Add(1)
}

type server struct{}

func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe(":9100", nil)
	if err != nil {
		log.Fatalf("metrics goroutine fail:%v", err)
	}
}

func init() {
	LoggingSettings(LogFile)
	prometheus.MustRegister(grpcRecvRankingReqs)
	prometheus.MustRegister(grpcSndRankingResps)
}

//LoggingSettings Initialization
func LoggingSettings(logFile string) {
	logfile, _ := os.OpenFile(filepath.Clean(logFile), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0600)
	multiLogFile := io.MultiWriter(os.Stdout, logfile)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(multiLogFile)
}

func get_date() (today_date string) {
	t := time.Now()
	year := t.Year()
	month := int(t.Month())
	day := t.Day()
	today := fmt.Sprintf("%02d%02d%02d", year, month, day)
	return today

}

func (s *server) RankItem(ctx context.Context, in *pb.GetRankItem) (*pb.RankResponse, error) {
	grpcRecvRankingReqcount()
	log.Printf("Received: Category:%v,Page:%v)", in.Category, in.Page)
	// prepare empty return value
	items := make([]*pb.RankingResult, 0)
	// get parameter
	page := in.Page
	category := in.Category
	//prepare redis command
	RedisHost := fmt.Sprintf("%v:%v", os.Getenv("REDIS_HOST"), 6379)
	today := get_date()
	filter := fmt.Sprintf("%v_%v", today, category)
	//connect to redis
	conn, err := redis.Dial("tcp", RedisHost)
	if err != nil {
		log.Printf("could not connect to redis server : %v", err)
	}
	defer conn.Close()
	//Get TotalNum(Ranking) on YYYYMMDD
	productTotalList, err := redis.Strings(conn.Do("ZREVRANGE", filter, 0, 99))
	if err != nil {
		log.Printf("could not execute redis operator : %v", err)
	}
	TotalLength := int32(len(productTotalList))
	//Get productlist(Ranking) on YYYYMMDD
	productList, err := redis.Strings(conn.Do("ZREVRANGE", filter, 10*page-10, 10*page-1))
	if err != nil {
		log.Printf("could not execute redis operator : %v", err)
	}
	//Get each productinfo
	for _, product_id := range productList {
		responseResult := &pb.RankingResult{}
		responseResult.ProductId = product_id
		responseResult.Category = category
		url, err := redis.String(conn.Do("HGET", product_id, "url"))
		if err != nil {
			log.Printf("could not execute redis operator : %v", err)
		}
		responseResult.ImageUrl = url
		price_raw, err := redis.String(conn.Do("HGET", product_id, "price"))
		if err != nil {
			log.Printf("could not execute redis operator : %v", err)
		}
		price, _ := safecast.Atoi32(price_raw)
		responseResult.Price = price
		name, err := redis.String(conn.Do("HGET", product_id, "name"))
		if err != nil {
			log.Printf("could not execute redis operator : %v", err)
		}
		responseResult.ProductName = name
		items = append(items, responseResult)
	}
	grpcSndRankingRespcount()
	return &pb.RankResponse{Response: items, TotalNum: TotalLength}, nil
}

func main() {
	// exec node-export service
	go exportMetrics()
	// Apl setting
	lis, err := net.Listen("tcp", Port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterRankItemsServer(s, &server{})
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}

}

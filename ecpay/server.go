package main

import (
	"context"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"reflect"

	"github.com/yabamuro/gocelery"

	pb "github.com/mockten/mockten_interfaces/ecpay"

	_ "github.com/go-sql-driver/mysql"
	"github.com/google/uuid"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	stripe "github.com/stripe/stripe-go"
	"github.com/stripe/stripe-go/card"
	"github.com/stripe/stripe-go/customer"
	"github.com/stripe/stripe-go/token"
	"google.golang.org/grpc"
	"gopkg.in/ini.v1"
)

type server struct{}

type ConfigList struct {
	Concurrency int
}

var Config ConfigList

const (
	LogFile   = "/var/log/apl/apl.log"
	Port      = "127.0.0.1:50052"
	TaskName  = "worker.execute"
	GetSQL    = "SELECT product_name,stock FROM PRODUCT_INFO WHERE product_id='%v';"
	InsertSQL = "INSERT INTO OPERATION_INFO (transaction_id, ec_audit_info, audit_time, balance_info, product_id, deal_stock) VALUES ('%v', 1, now(), 100, '%v', 1)"
	MySQLHost = "%v:%v@tcp(%v)/%v"
	TaskQueue = "payment"
)

var (
	grpcRecvPayrequestResps = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_req_grpc_payrequest",
			Help: "How many gRPC requests recv from ecfront.",
		},
		[]string{"code", "method"},
	)
)
var (
	grpcSndPayrequestResps = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_resp_grpc_payrequest",
			Help: "How many gRPC requests snd to ecfont.",
		},
		[]string{"code", "method"},
	)
)

var (
	celerySndPayexecutionReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_req_celery_payexecution",
			Help: "How many celery requests snd to payexecution.",
		},
		[]string{"code", "method"},
	)
)

func grpcRecvPayrequestRespcount() {
	grpcRecvPayrequestResps.WithLabelValues("200", "GET").Add(1)
}
func grpcSndPayrequestRespcount() {
	grpcSndPayrequestResps.WithLabelValues("200", "GET").Add(1)
}
func celerySndPayexecutionReqscount() {
	celerySndPayexecutionReqs.WithLabelValues("200", "GET").Add(1)
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
		log.Fatalf("Initialization Error:%v", err)
		panic(err.Error())
	}
	Config = ConfigList{
		Concurrency: cfg.Section("api").Key("concurrency").MustInt(),
	}
	prometheus.MustRegister(grpcRecvPayrequestResps)
	prometheus.MustRegister(grpcSndPayrequestResps)
	prometheus.MustRegister(celerySndPayexecutionReqs)
}

//LoggingSettings Initialization
func LoggingSettings(logFile string) {
	logfile, _ := os.OpenFile(filepath.Clean(logFile), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0600)
	multiLogFile := io.MultiWriter(os.Stdout, logfile)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(multiLogFile)
}

func getCardToken(cardNum string, expMonth string, expYear string, cvc string, name string) (cardToken string) {
	tokenParams := &stripe.TokenParams{
		Card: &stripe.CardParams{
			Number:   stripe.String(cardNum),
			ExpMonth: stripe.String(expMonth),
			ExpYear:  stripe.String(expYear),
			CVC:      stripe.String(cvc),
			Name:     stripe.String(name),
		},
	}
	t, _ := token.New(tokenParams)
	token := reflect.ValueOf(*t)
	for i := 0; i < token.NumField(); i++ {
		if token.Type().Field(i).Name == "ID" {
			cardToken = fmt.Sprintf("%v", token.Field(i).Interface())
		}
	}
	return cardToken
}

func getCutomerID(address string) (customerid string) {
	customparams := &stripe.CustomerParams{
		Email: stripe.String(address),
	}
	c, _ := customer.New(customparams)
	cv := reflect.ValueOf(*c)
	for i := 0; i < cv.NumField(); i++ {
		if cv.Type().Field(i).Name == "ID" {
			customerid = fmt.Sprintf("%v", cv.Field(i).Interface())
		}
	}
	return customerid

}

func getCardID(customerid string, cardToken string) (cardid string) {
	cardparams := &stripe.CardParams{
		Customer: stripe.String(customerid),
		Token:    stripe.String(cardToken),
	}
	cardobj, _ := card.New(cardparams)
	cardv := reflect.ValueOf(*cardobj)
	for i := 0; i < cardv.NumField(); i++ {
		if cardv.Type().Field(i).Name == "ID" {
			cardid = fmt.Sprintf("%v", cardv.Field(i).Interface())
		}
	}
	return cardid
}

func (s *server) CreateTransaction(ctx context.Context, in *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	grpcRecvPayrequestRespcount()
	log.Printf("Received: %v", in.Request)
	cardNum := ""
	expMonth := ""
	expYear := ""
	cvc := ""
	name := ""
	address := ""
	userID := ""
	eachStatus := make(map[string]*pb.EachResponse)
	Response := &pb.RegisterResponse{}
	Response.Status = "NG"
	Response.Response = eachStatus
	//Generate Transaction ID
	u, err := uuid.NewRandom()
	if err != nil {
		log.Printf("Generate Transaction Error:%v", err)
		return Response, nil
	}
	TransactionID := u.String()
	// Celery Setting
	cli, err := gocelery.NewCeleryClient(
		gocelery.NewRedisCeleryBroker(os.Getenv("RedisHost"), TaskQueue),
		gocelery.NewRedisCeleryBackend(os.Getenv("RedisHost")),
		Config.Concurrency,
	)
	if err != nil {
		log.Printf("Celery Connection Error:%v", err)
		return Response, nil
	}
	// Connect DB
	mySqlHost := fmt.Sprintf(MySQLHost, os.Getenv("MysqlUser"), os.Getenv("MysqlPassword"), os.Getenv("DbHost"), os.Getenv("MysqlDB"))
	db, err := sql.Open("mysql", mySqlHost)
	if err != nil {
		log.Printf("Connect DB Error:%v(TransactionId:%v)", err, TransactionID)
		return Response, nil
	}
	defer db.Close()
	paymentType := in.PaymentType
	if paymentType == "Stripe" {
		cardNum = in.CardNum
		expMonth = in.ExpMonth
		expYear = in.ExpYear
		cvc = in.Cvc
		name = in.Name
		address = in.Address
	} else {
		userID = in.UserId
	}
	for key, value := range in.Request {
		var productName string
		var productStuck int32
		EachResponse := &pb.EachResponse{}
		EachResponse.Status = "NG"
		EachResponse.Msg = "NG"
		productID := key
		dealStock := value.DealStock
		totalAmount := value.TotalAmount
		//Get Product Name
		Query := fmt.Sprintf(GetSQL, productID)
		err = db.QueryRow(Query).Scan(&productName, &productStuck)
		if err != nil {
			log.Printf("Get Production Name Error:%v(ProductId:%v,TransactionId:%v)", err, productID, TransactionID)
			EachResponse.Msg = "GetName Error"
			eachStatus[productID] = EachResponse
			continue
		}
		//Check Deal Stock
		if productStuck < dealStock {
			EachResponse.Msg = "Stock Insufficient"
			eachStatus[productName] = EachResponse
			Response.Response = eachStatus
			return Response, nil
		}
		//Register Transaction ID to DB
		Query = fmt.Sprintf(InsertSQL, TransactionID, productID)
		_, err = db.Query(Query)
		if err != nil {
			log.Printf("Register Transaction ID Error:%v(ProductId:%v,TransactionId:%v)", err, productID, TransactionID)
			EachResponse.Msg = "Register Error"
			eachStatus[productName] = EachResponse
			continue
		}
		//Enqueue to BackEnd
		if paymentType == "Stripe" {
			stripe.Key = os.Getenv("SecretKeyString")
			cardToken := getCardToken(cardNum, expMonth, expYear, cvc, name)
			customerid := getCutomerID(address)
			cardid := getCardID(customerid, cardToken)
			// Run Task
			celerySndPayexecutionReqscount()
			_, err = cli.Delay(TaskName, TransactionID, productID, customerid, in.Itemurl, in.Itemname, userID, cardid, address, "start", dealStock, totalAmount, in.Itemcategory, in.Itemprice, 0, false)
			if err != nil {
				log.Printf("Enqueue Error:%v(ProductId:%v,TransactionId:%v)", err, productID, TransactionID)
				EachResponse.Msg = "Enqueue Error"
				eachStatus[productName] = EachResponse
				continue
			}
			EachResponse.Status = "OK"
			EachResponse.Msg = "OK"
			eachStatus[productName] = EachResponse
		} else {
			//need to update when bc implamented
			EachResponse.Status = "OK"
			EachResponse.Msg = "OK"
			eachStatus[productName] = EachResponse
		}
	}
	if len(eachStatus) == 0 {
		log.Printf("No designated item on DB(%v)", TransactionID)
		return Response, nil

	}
	Response.Status = "OK"
	Response.Response = eachStatus
	grpcSndPayrequestRespcount()
	return Response, nil
}

func main() {
	// exec node-export service
	go exportMetrics()
	// Gin setting
	lis, err := net.Listen("tcp", Port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterTransactionServer(s, &server{})
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

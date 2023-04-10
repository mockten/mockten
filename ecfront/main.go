package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/gob"
	"fmt"
	"io"
	"log"
	"math"
	"net"
	"net/http"
	"os"
	"path/filepath"
	pb "pb/ecfront"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/storage"

	"github.com/gomodule/redigo/redis"

	"github.com/google/uuid"

	"github.com/CorgiMan/json2"
	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	pb "github.com/mockten/mockten_interfaces/ecfront"
	"github.com/rung/go-safecast"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/yabamuro/gocelery"
	"golang.org/x/oauth2"
	"google.golang.org/api/option"
	"google.golang.org/grpc"
	"gopkg.in/coreos/go-oidc.v2"
	"gopkg.in/ini.v1"
)

// Product Info
type Product struct {
	ID       string
	Name     string
	Stocks   int32
	ImageURL string
	Price    int32
	Comment  string
	Category int32
}

type RankProduct struct {
	ID       string
	Name     string
	ImageURL string
	Price    int32
	Category int32
}

type WatchProduct struct {
	ID       string
	Name     string
	ImageURL string
	Price    int32
}

type Opinion struct {
	Message string
}

type User struct {
	Code  string `json: code`
	State string `json: state`
}

//Const Setting
const (
	ErrHtml          = "err.html"
	FailedConMsg     = "Failed to connect: %v"
	FailedSessionMsg = "Failed to Save session(%v)"
	FailedParseMsg   = "failed to parseform: %v"
	ParamResolvErr   = "could not resolve request parameter : %v"
	GrpcRcvCont      = "RCV(gRPC): %v"
	RedisConErr      = "could not connect to redis server : %v"
	PayResultHtml    = "payresult.html"
	userKey          = "user"
	LogFile          = "/var/log/apl/apl.log"
	LogoutUrl        = "logout"
	LoginUrl         = "/login"
	DefaultCategory  = 99
	DefaultFilter    = 3
	DefaultPage      = 1
	MaxEndNum        = float64(10)
	MinStartNum      = float64(1)
	DicrectDebitType = "DirectDebit"
	StripeType       = "Stripe"
	DefaultResult    = "NG"
	SuccessResult    = "OK"
	TaskName         = "worker.notification"
	TaskQueue        = "notification"
	CsvHeader        = "time,type,pname,id,useragent,loc\n"
)

type ConfigList struct {
	SuccessMsg         string
	InsufficientMsg    string
	ErrorMsg           string
	RedirectUrl        string
	HomeUrl            string
	credentialFilePath string
}
type Authenticator struct {
	Provider *oidc.Provider
	Config   oauth2.Config
	Ctx      context.Context
}

var Config ConfigList

var (
	grpcSndSearchItemReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_req_grpc_searchitem",
			Help: "How many gRPC requests snd to searchitem.",
		},
		[]string{"code", "method"},
	)
)
var (
	grpcRcvSearchItemReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_resp_grpc_searchitem",
			Help: "How many gRPC requests rcv frm searchitem.",
		},
		[]string{"code", "method"},
	)
)

var (
	grpcSndRankingReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_req_grpc_ranking",
			Help: "How many gRPC requests snd to ranking.",
		},
		[]string{"code", "method"},
	)
)
var (
	grpcRcvRankingReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_resp_grpc_ranking",
			Help: "How many gRPC requests rcv frm ranking.",
		},
		[]string{"code", "method"},
	)
)

var (
	grpcSndPayrequestReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_req_grpc_payrequest",
			Help: "How many gRPC requests snd to payrequest.",
		},
		[]string{"code", "method"},
	)
)
var (
	grpcRcvPayrequestReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "rcv_resp_grpc_payrequest",
			Help: "How many gRPC requests rcv frm payrequest.",
		},
		[]string{"code", "method"},
	)
)

var (
	celerySndOpinionReqs = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "snd_req_celery_notification",
			Help: "How many celery requests snd to opinion.",
		},
		[]string{"code", "method"},
	)
)

func NewAuthenticator() (*Authenticator, error) {
	ctx := context.Background()

	provider, err := oidc.NewProvider(ctx, os.Getenv("Auth0ProvideUrl"))
	if err != nil {
		log.Printf("failed to get provider: %v", err)
		return nil, err
	}

	conf := oauth2.Config{
		ClientID:     os.Getenv("Auth0ClientId"),
		ClientSecret: os.Getenv("Auth0ClientSecret"),
		RedirectURL:  Config.RedirectUrl,
		Endpoint:     provider.Endpoint(),
		Scopes:       []string{oidc.ScopeOpenID},
	}

	return &Authenticator{
		Provider: provider,
		Config:   conf,
		Ctx:      ctx,
	}, nil
}

func grpcSndSearchItemReqcount() {
	grpcSndSearchItemReqs.WithLabelValues("200", "GET").Add(1)
}
func grpcRcvSearchItemReqcount() {
	grpcRcvSearchItemReqs.WithLabelValues("200", "GET").Add(1)
}

func grpcSndRankingReqcount() {
	grpcSndRankingReqs.WithLabelValues("200", "GET").Add(1)
}
func grpcRcvRankingReqcount() {
	grpcRcvRankingReqs.WithLabelValues("200", "GET").Add(1)
}

func grpcSndPayrequestReqcount() {
	grpcSndPayrequestReqs.WithLabelValues("200", "GET").Add(1)
}
func grpcRcvPayrequestReqcount() {
	grpcRcvPayrequestReqs.WithLabelValues("200", "GET").Add(1)
}

func celerySndOpinionReqcount() {
	celerySndOpinionReqs.WithLabelValues("200", "GET").Add(1)
}

func init() {
	LoggingSettings(LogFile)
	cfg, err := ini.Load("config.ini")
	if err != nil {
		log.Fatalf("Initialization Error:%v", err)
		panic(err.Error())
	}
	Config = ConfigList{
		SuccessMsg:         cfg.Section("api").Key("success_msg").String(),
		InsufficientMsg:    cfg.Section("api").Key("insufficient_msg").String(),
		ErrorMsg:           cfg.Section("api").Key("error_msg").String(),
		RedirectUrl:        cfg.Section("api").Key("redirect_url").String(),
		HomeUrl:            cfg.Section("api").Key("home_url").String(),
		credentialFilePath: cfg.Section("api").Key("gcs_sa_path").String(),
	}
	prometheus.MustRegister(grpcSndSearchItemReqs)
	prometheus.MustRegister(grpcRcvSearchItemReqs)
	prometheus.MustRegister(grpcSndRankingReqs)
	prometheus.MustRegister(grpcRcvRankingReqs)
	prometheus.MustRegister(grpcSndPayrequestReqs)
	prometheus.MustRegister(grpcRcvPayrequestReqs)
	prometheus.MustRegister(celerySndOpinionReqs)
	gob.Register(map[string]interface{}{})
}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	err := http.ListenAndServe(":9100", nil)
	if err != nil {
		log.Fatalf("metrics goroutine fail:%v", err)
	}
}

//LoggingSettings Initialization
func LoggingSettings(logFile string) {
	logfile, _ := os.OpenFile(filepath.Clean(logFile), os.O_RDWR|os.O_CREATE|os.O_APPEND, 0600)
	multiLogFile := io.MultiWriter(os.Stdout, logfile)
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)
	log.SetOutput(multiLogFile)
}

//Session Check
func SessionCheck(ctx *gin.Context) (url string, path string) {
	session := sessions.Default(ctx)
	if v := session.Get("id_token"); v != nil {
		return LogoutUrl, "Logout"
	}
	return LoginUrl, "Login"
}

//SearchItem main
func SearchItem(ctx *gin.Context, searchName string, category int32, filter int32, page int32) (ProductList []Product, TotalNum int32) {
	if len(searchName) == 0 {
		ctx.HTML(http.StatusOK, "home.html", gin.H{})
	}
	SearchHost := fmt.Sprintf("%v:%v", os.Getenv("SEARCHITEM_SERVICE_HOST"), 50051)
	conn, err := grpc.Dial(SearchHost, grpc.WithInsecure())
	if err != nil {
		log.Fatalf(FailedConMsg, err)
	}
	defer conn.Close()
	con := pb.NewSearchItemsClient(conn)
	grpcSndSearchItemReqcount()
	log.Printf("SND(gRPC): {ProductName:%v,Category:%v,RankingFilter:%v,Page:%v ", searchName, category, filter, page)
	r, err := con.SearchItem(context.Background(), &pb.GetSearchItem{
		ProductName:   searchName,
		Category:      category,
		RankingFilter: filter,
		Page:          page,
	})
	if err != nil {
		log.Printf(ParamResolvErr, err)
	}
	grpcRcvSearchItemReqcount()
	log.Printf(GrpcRcvCont, r.Response)
	for _, value := range r.Response {
		var product Product
		product.ID = value.ProductId
		product.Name = value.ProductName
		product.Stocks = value.Stocks
		product.ImageURL = value.ImageUrl
		product.Price = value.Price
		product.Comment = value.Comment
		product.Category = value.Category
		ProductList = append(ProductList, product)
	}
	return ProductList, r.TotalNum
}

//GCS Upload
func historyStack(ctx *gin.Context, kind string, productName string) {
	var clientIp = "NaN"
	var consumerId string
	var guestId string
	u, _ := uuid.NewRandom()
	csvUuid := u.String()
	csvFileName := fmt.Sprintf("%v.csv", csvUuid)
	Ip := net.ParseIP(ctx.ClientIP()).To4()
	if Ip != nil {
		clientIp = Ip.String()
	} else {
		log.Printf("Failed to covert from IPv6 to IPv4(%v)", ctx.ClientIP())
	}
	session := sessions.Default(ctx)
	if v := session.Get("guestId"); v != nil {
		guestId = fmt.Sprintf("%v", v)

	} else {
		u, _ := uuid.NewRandom()
		guestId := u.String()
		session.Set("guestId", guestId)
		err := session.Save()
		if err != nil {
			log.Printf(FailedSessionMsg, guestId)
		}
	}
	consumerId = guestId
	t := time.Now()
	timeValue := fmt.Sprintf("%04d/%02d/%02d/%02d:%02d:%02d", t.Year(), int(t.Month()), t.Day(), t.Hour(), t.Minute(), t.Second())
	if len(consumerId) == 0 {
		consumerId = "NaN"
	}
	InsertValue := fmt.Sprintf("%v%v,%v,%v,%v,%v,%v\n", CsvHeader, timeValue, kind, productName, consumerId, ctx.GetHeader("User-Agent"), clientIp)
	gcsUpload(csvFileName, InsertValue)

}

//GCS Upload
func gcsUpload(fileName string, FileContent string) {
	filePath := fmt.Sprintf("raws/%v", fileName)
	ctx := context.Background()
	client, err := storage.NewClient(ctx, option.WithCredentialsFile(Config.credentialFilePath))
	if err != nil {
		log.Println(err)
		return
	}
	bucketName := strings.TrimRight(os.Getenv("FRONT_BUCKET"), "\n")
	obj := client.Bucket(bucketName).Object(filePath)
	wc := obj.NewWriter(ctx)
	defer wc.Close()
	if _, err := wc.Write([]byte(FileContent)); err != nil {
		log.Printf("%v", err)
		return
	}
}

//RankItem main
func RankItem(ctx *gin.Context, category int32, page int32) (ProductList []RankProduct, TotalNum int32) {
	RankHost := fmt.Sprintf("%v:%v", os.Getenv("RANKING_SERVICE_HOST"), 50053)
	conn, err := grpc.Dial(RankHost, grpc.WithInsecure())
	if err != nil {
		log.Fatalf(FailedConMsg, err)
	}
	defer conn.Close()
	con := pb.NewRankItemsClient(conn)
	grpcSndRankingReqcount()
	log.Printf("SND(gRPC): {Category:%v,Page:%v ", category, page)
	r, err := con.RankItem(context.Background(), &pb.GetRankItem{
		Category: category,
		Page:     page,
	})
	if err != nil {
		log.Printf(ParamResolvErr, err)
	}
	grpcRcvRankingReqcount()
	log.Printf(GrpcRcvCont, r.Response)
	for _, value := range r.Response {
		var product RankProduct
		product.ID = value.ProductId
		product.Name = value.ProductName
		product.ImageURL = value.ImageUrl
		product.Price = value.Price
		product.Category = value.Category
		ProductList = append(ProductList, product)
	}
	return ProductList, r.TotalNum
}

//WatchItem main
func AddWatchItem(ctx *gin.Context, consumerId string, page int32) (ProductList []WatchProduct, TotalNum int32) {
	RedisHost := os.Getenv("REDIS_HOST")[8:]
	//connect to redis
	conn, err := redis.Dial("tcp", RedisHost)
	if err != nil {
		log.Printf(RedisConErr, err)
		ctx.Status(http.StatusInternalServerError)
	}
	defer conn.Close()
	//Get Watch Item List
	RedisList, err := redis.Strings(conn.Do("SMEMBERS", consumerId))
	if err != nil {
		log.Printf("could not execute redis operator : %v", err)
		ctx.Status(http.StatusInternalServerError)
	}
	TotalNum = int32(len(RedisList))
	startNum := int(math.Min(float64(TotalNum), float64(10*page-9)))
	endNum := int(math.Min(float64(float64(TotalNum)), float64(10*page)))

	if startNum == 0 {
		return ProductList, TotalNum
	}

	for _, product_info := range RedisList[startNum-1 : endNum] {
		var product WatchProduct
		productInfoList := strings.Split(product_info, "\t")
		productId := productInfoList[0]
		productName := productInfoList[1]
		imageUrl := productInfoList[2]
		price, _ := strconv.ParseInt(productInfoList[3], 10, 32)
		product.ID = productId
		product.Name = productName
		product.Price = int32(price)
		product.ImageURL = imageUrl
		ProductList = append(ProductList, product)
	}

	return ProductList, TotalNum
}

//RequestPayment main
func RequestPayment(ctx *gin.Context, marker string, eachrequest map[string]*pb.EachRequest, Address string, Name string, CardNum string, Month string, Year string, Cvc string, UserId string, Password string, ItemName string, ItemURL string, ItemCategory int32, itemPrice int32) (Result string) {
	Result = DefaultResult
	PayHost := fmt.Sprintf("%v:%v", os.Getenv("ECPAY_SERVICE_HOST"), 50052)
	conn, err := grpc.Dial(PayHost, grpc.WithInsecure())
	if err != nil {
		log.Printf(FailedConMsg, err)
		return Result
	}
	defer conn.Close()
	con := pb.NewTransactionClient(conn)
	if marker == StripeType {
		grpcSndPayrequestReqcount()
		log.Printf("SND(gRPC): {Address:%v,PaymentType:%v}", Address, marker)
		r, err := con.CreateTransaction(context.Background(), &pb.RegisterRequest{
			Address:      Address,
			CardNum:      CardNum,
			ExpMonth:     Month,
			ExpYear:      Year,
			Cvc:          Cvc,
			Name:         Name,
			PaymentType:  StripeType,
			Request:      eachrequest,
			Itemname:     ItemName,
			Itemurl:      ItemURL,
			Itemcategory: ItemCategory,
			Itemprice:    itemPrice,
		})
		if err != nil {
			log.Printf(ParamResolvErr, err)
			return Result
		}
		grpcRcvPayrequestReqcount()
		log.Printf(GrpcRcvCont, r.Response)
		Result = r.Status
	} else {
		grpcSndPayrequestReqcount()
		log.Printf("SND(gRPC): {UserId:%v,PaymentType:%v", UserId, marker)
		r, err := con.CreateTransaction(context.Background(), &pb.RegisterRequest{
			UserId:       UserId,
			Password:     Password,
			PaymentType:  DicrectDebitType,
			Request:      eachrequest,
			Itemname:     ItemName,
			Itemurl:      ItemURL,
			Itemcategory: ItemCategory,
			Itemprice:    itemPrice,
		})
		if err != nil {
			log.Printf(ParamResolvErr, err)
			return Result
		}
		grpcRcvPayrequestReqcount()
		log.Printf(GrpcRcvCont, r.Response)
		Result = r.Status
	}
	return Result
}

func router() *gin.Engine {
	// Gin setting
	router := gin.Default()
	store := cookie.NewStore([]byte("secret"))
	router.Use(sessions.Sessions("mysession", store))
	router.Static("/templates", "./templates")
	router.Static("/assets", "./assets")
	router.StaticFile("/favicon.ico", "./assets/img/favicon.ico")
	router.LoadHTMLGlob("templates/*.html")
	router.NoRoute(func(c *gin.Context) {
		c.HTML(http.StatusNotFound, "404error.html", gin.H{})
	})
	router.GET("/home", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		ctx.HTML(http.StatusOK, "home.html", gin.H{
			"AuthPath": AuthPath,
			"AuthKind": AuthKind,
		})
	})
	router.GET(LoginUrl, func(ctx *gin.Context) {
		b := make([]byte, 32)
		_, err := rand.Read(b)
		if err != nil {
			ctx.Status(http.StatusInternalServerError)
			return
		}
		state := base64.StdEncoding.EncodeToString(b)
		authenticator, err := NewAuthenticator()
		if err != nil {
			ctx.Status(http.StatusInternalServerError)
			return
		}

		ctx.Redirect(http.StatusMovedPermanently, authenticator.Config.AuthCodeURL(state))
	})
	router.GET(LogoutUrl, func(ctx *gin.Context) {
		refererUrl := ctx.Request.Header.Get("Referer")
		if refererUrl == "" || refererUrl == "/" {
			refererUrl = Config.HomeUrl

		}
		session := sessions.Default(ctx)
		session.Clear()
		err := session.Save()
		if err != nil {
			log.Printf(FailedSessionMsg, err)
		}
		ctx.Redirect(http.StatusMovedPermanently, refererUrl)
	})
	router.POST("/logout", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		ctx.HTML(http.StatusInternalServerError, ErrHtml, gin.H{
			"AuthPath": AuthPath,
			"AuthKind": AuthKind,
		})
	})
	router.POST(LoginUrl, func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		ctx.HTML(http.StatusInternalServerError, ErrHtml, gin.H{
			"AuthPath": AuthPath,
			"AuthKind": AuthKind,
		})
	})
	router.GET("/auth", func(ctx *gin.Context) {
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		session := sessions.Default(ctx)
		authenticator, err := NewAuthenticator()
		if err != nil {
			ctx.Status(http.StatusInternalServerError)
			return
		}
		token, err := authenticator.Config.Exchange(context.TODO(), ctx.Query("code"))
		if err != nil {
			log.Printf("no token found: %v", err)
			ctx.Status(http.StatusInternalServerError)
			return
		}
		rawIDToken, ok := token.Extra("id_token").(string)
		if !ok {
			log.Printf("No id_token field in oauth2 token.")
			ctx.Status(http.StatusInternalServerError)
			return
		}
		oidcConfig := &oidc.Config{
			ClientID: os.Getenv("Auth0ClientId"),
		}
		idToken, err := authenticator.Provider.Verifier(oidcConfig).Verify(context.TODO(), rawIDToken)
		if err != nil {
			log.Printf("Failed to verify ID Token: %v", err)
			ctx.Status(http.StatusInternalServerError)
			return
		}
		// Getting now the userInfo
		var profile map[string]interface{}
		if err := idToken.Claims(&profile); err != nil {
			log.Printf("Failed to get userInfo: %v", err)
			ctx.Status(http.StatusInternalServerError)
			return
		}
		session.Set("id_token", rawIDToken)
		session.Set("access_token", token.AccessToken)
		session.Set("profile", profile)
		err = session.Save()
		if err != nil {
			log.Printf(FailedSessionMsg, err)
		}
		ctx.Redirect(http.StatusPermanentRedirect, "/home")
	})
	router.POST("/search", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		searchName := ctx.Request.PostForm["item"][0]
		historyStack(ctx, "search", searchName)
		ProductList, TotalNum := SearchItem(ctx, searchName, DefaultCategory, DefaultFilter, DefaultPage)
		ctx.HTML(http.StatusOK, "search.html", gin.H{
			"ProductName": searchName,
			"Product":     ProductList,
			"TotalNum":    TotalNum,
			"startNum":    int(math.Min(float64(TotalNum), MinStartNum)),
			"endNum":      int(math.Min(float64(TotalNum), MaxEndNum)),
			"Page":        DefaultPage,
			"Category":    DefaultCategory,
			"Filter":      DefaultFilter,
			"AuthPath":    AuthPath,
			"AuthKind":    AuthKind,
		})
	})
	router.GET("/search", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		searchName := ctx.Query("name")
		pageNum, _ := safecast.Atoi32(ctx.Query("page"))
		category, _ := safecast.Atoi32(ctx.Query("category"))
		filter, _ := safecast.Atoi32(ctx.Query("filter"))
		ProductList, TotalNum := SearchItem(ctx, searchName, category, filter, pageNum)
		ctx.HTML(http.StatusOK, "search.html", gin.H{
			"ProductName": searchName,
			"Product":     ProductList,
			"TotalNum":    TotalNum,
			"startNum":    int(math.Min(float64(TotalNum), float64(10*pageNum-9))),
			"endNum":      int(math.Min(float64(TotalNum), float64(10*pageNum))),
			"Page":        pageNum,
			"Category":    category,
			"Filter":      filter,
			"AuthPath":    AuthPath,
			"AuthKind":    AuthKind,
		})
	})
	router.GET("/watchlist", func(ctx *gin.Context) {
		var consumerId string
		var guestId string
		var ProductList []WatchProduct
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		AuthPath, AuthKind := SessionCheck(ctx)
		session := sessions.Default(ctx)
		//If profile is not set in Session, the user is recognized as a guest user.
		if profile := session.Get("profile"); profile != nil {
			v, _ := profile.(map[string]interface{})
			sub := fmt.Sprintf("%v", v["sub"])
			consumerId = strings.Split(sub, "|")[1]
		} else {
			//If guestId is not set in Session, the user is recognized as a first guest user to watchlist.
			if v := session.Get("guestId"); v != nil {
				guestId = fmt.Sprintf("%v", v)

			} else {
				//return empty list
				ctx.HTML(http.StatusOK, "watch.html", gin.H{
					"Product":  ProductList,
					"TotalNum": 0,
					"startNum": 0,
					"endNum":   0,
					"Page":     1,
					"AuthPath": AuthPath,
					"AuthKind": AuthKind,
				})
			}
			consumerId = guestId
		}
		pageNum, err := safecast.Atoi32(ctx.Query("page"))
		if err != nil {
			log.Printf("Query missing: %v", err)
			ctx.HTML(http.StatusInternalServerError, ErrHtml, gin.H{
				"AuthPath": AuthPath,
				"AuthKind": AuthKind,
			})
		} else {
			ProductList, TotalNum := AddWatchItem(ctx, consumerId, pageNum)
			ctx.HTML(http.StatusOK, "watch.html", gin.H{
				"Product":  ProductList,
				"TotalNum": TotalNum,
				"startNum": int(math.Min(float64(TotalNum), float64(10*pageNum-9))),
				"endNum":   int(math.Min(float64(TotalNum), float64(10*pageNum))),
				"Page":     pageNum,
				"AuthPath": AuthPath,
				"AuthKind": AuthKind,
			})
		}
	})
	router.GET("/ranking", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		pageNum, _ := safecast.Atoi32(ctx.Query("page"))
		category, _ := safecast.Atoi32(ctx.Query("category"))
		ProductList, TotalNum := RankItem(ctx, category, pageNum)
		ctx.HTML(http.StatusOK, "ranking.html", gin.H{
			"Product":  ProductList,
			"TotalNum": TotalNum,
			"startNum": int(math.Min(float64(TotalNum), float64(10*pageNum-9))),
			"endNum":   int(math.Min(float64(TotalNum), float64(10*pageNum))),
			"Page":     pageNum,
			"Category": category,
			"AuthPath": AuthPath,
			"AuthKind": AuthKind,
		})
	})
	router.POST("/payreqest", func(ctx *gin.Context) {
		AuthPath, AuthKind := SessionCheck(ctx)
		err := ctx.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		Marker := ctx.Request.PostForm["marker"][0]
		DealStock, _ := safecast.Atoi32(ctx.Request.PostForm["dealstock"][0])
		Quantity, _ := safecast.Atoi32(ctx.Request.PostForm["quantity"][0])
		if Quantity > DealStock {
			ctx.HTML(http.StatusOK, PayResultHtml, gin.H{
				"Msg":      Config.InsufficientMsg,
				"AuthPath": AuthPath,
				"AuthKind": AuthKind,
			})
		}
		Price, _ := safecast.Atoi32(ctx.Request.PostForm["price"][0])
		TotalAmount := Price * Quantity
		eachRequest := &pb.EachRequest{}
		eachRequest.DealStock = Quantity
		eachRequest.TotalAmount = TotalAmount
		ProductID := ctx.Request.PostForm["productid"][0]
		ItemName := ctx.Request.PostForm["productname"][0]
		ItemURL := ctx.Request.PostForm["itemurl"][0]
		ItemCategory, _ := safecast.Atoi32(ctx.Request.PostForm["itemcategory"][0])
		requestComp := map[string]*pb.EachRequest{ProductID: eachRequest}
		historyStack(ctx, "buy", ItemName)
		if Marker == StripeType {
			Address := ctx.Request.PostForm["address"][0]
			Name := ctx.Request.PostForm["name"][0]
			CardNum := ctx.Request.PostForm["cardnum"][0]
			Month := ctx.Request.PostForm["month"][0]
			Year := ctx.Request.PostForm["year"][0]
			Cvc := ctx.Request.PostForm["cvc"][0]
			Result := RequestPayment(ctx, StripeType, requestComp, Address, Name, CardNum, Month, Year, Cvc, "", "", ItemName, ItemURL, ItemCategory, Price)
			if Result != SuccessResult {
				ctx.HTML(http.StatusOK, PayResultHtml, gin.H{
					"Msg":      Config.ErrorMsg,
					"AuthPath": AuthPath,
					"AuthKind": AuthKind,
				})
			}

		} else {
			UserId := ctx.Request.PostForm["userid"][0]
			Password := ctx.Request.PostForm["password"][0]
			Result := RequestPayment(ctx, DicrectDebitType, requestComp, "", "", "", "", "", "", UserId, Password, ItemName, ItemURL, ItemCategory, Price)
			if Result != SuccessResult {
				ctx.HTML(http.StatusOK, PayResultHtml, gin.H{
					"Msg":      Config.ErrorMsg,
					"AuthPath": AuthPath,
					"AuthKind": AuthKind,
				})
			}
		}
		ctx.HTML(http.StatusOK, PayResultHtml, gin.H{
			"Msg":      Config.SuccessMsg,
			"AuthPath": AuthPath,
			"AuthKind": AuthKind,
		})
	})
	router.POST("/watch", func(c *gin.Context) {
		var consumerId string
		var guestId string
		err := c.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		session := sessions.Default(c)
		//If profile is not set in Session, the user is recognized as a guest user.
		if profile := session.Get("profile"); profile != nil {
			v, _ := profile.(map[string]interface{})
			sub := fmt.Sprintf("%v", v["sub"])
			consumerId = strings.Split(sub, "|")[1]
		} else {
			//If guestId is not set in Session, the user is recognized as a first guest user to watchlist.
			if v := session.Get("guestId"); v != nil {
				guestId = fmt.Sprintf("%v", v)

			} else {
				u, _ := uuid.NewRandom()
				guestId = u.String()
				session.Set("guestId", guestId)
				err := session.Save()
				if err != nil {
					log.Printf(FailedSessionMsg, guestId)
				}
			}
			consumerId = guestId
		}
		productId := c.Request.PostForm["id"][0]
		productName := c.Request.PostForm["name"][0]
		imageUrl := c.Request.PostForm["image_url"][0]
		price := c.Request.PostForm["price"][0]
		insertValue := fmt.Sprintf("%v\t%v\t%v\t%v", productId, productName, imageUrl, price)
		RedisHost := os.Getenv("REDIS_HOST")[8:]
		//connect to redis
		conn, err := redis.Dial("tcp", RedisHost)
		if err != nil {
			log.Printf(RedisConErr, err)
			c.Status(http.StatusInternalServerError)
		}
		defer conn.Close()
		//insert the product info into Redis
		_, err = conn.Do("SADD", consumerId, insertValue)
		if err != nil {
			log.Printf("failed REDIS SREM: %v", err)
		}
		c.Status(http.StatusOK)
	})
	router.PATCH("/watch", func(c *gin.Context) {
		var consumerId string
		var guestId string
		err := c.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		session := sessions.Default(c)
		//If profile is not set in Session, the user is recognized as a guest user.
		if profile := session.Get("profile"); profile != nil {
			v, _ := profile.(map[string]interface{})
			sub := fmt.Sprintf("%v", v["sub"])
			consumerId = strings.Split(sub, "|")[1]
		} else {
			//If guestId is not set in Session, the user is recognized as a first guest user to watchlist.
			if v := session.Get("guestId"); v != nil {
				guestId = fmt.Sprintf("%v", v)

			} else {
				u, _ := uuid.NewRandom()
				guestId = u.String()
				session.Set("guestId", guestId)
				err := session.Save()
				if err != nil {
					log.Printf("could not save session : %v", err)
				}
			}
			consumerId = guestId
		}
		productId := c.Request.PostForm["id"][0]
		productName := c.Request.PostForm["name"][0]
		imageUrl := c.Request.PostForm["image_url"][0]
		price := c.Request.PostForm["price"][0]
		removeValue := fmt.Sprintf("%v\t%v\t%v\t%v", productId, productName, imageUrl, price)
		RedisHost := os.Getenv("REDIS_HOST")[8:]
		//connect to redis
		conn, err := redis.Dial("tcp", RedisHost)
		if err != nil {
			log.Printf(RedisConErr, err)
			c.Status(http.StatusInternalServerError)
		}
		defer conn.Close()
		//insert the product info into Redis
		_, err = conn.Do("SREM", consumerId, removeValue)
		if err != nil {
			log.Printf("failed REDIS SREM: %v", err)
			c.Status(http.StatusInternalServerError)
		}
		c.Status(http.StatusOK)
	})
	router.POST("/opinion", func(c *gin.Context) {
		err := c.Request.ParseForm()
		if err != nil {
			log.Printf(FailedParseMsg, err)
		}
		opinion := Opinion{}
		opinionRaw, err := c.GetRawData()
		if err != nil {
			log.Printf("Failed to convert from rawdata to struct:%v", err)
			c.Status(http.StatusInternalServerError)
		}
		err = json2.Unmarshal(opinionRaw, &opinion)
		if err != nil {
			log.Printf("failed to json marshal: %v", err)
			c.Status(http.StatusInternalServerError)
		}
		message := opinion.Message
		cli, err := gocelery.NewCeleryClient(
			gocelery.NewRedisCeleryBroker(os.Getenv("REDIS_HOST"), TaskQueue),
			gocelery.NewRedisCeleryBackend(os.Getenv("REDIS_HOST")),
			1,
		)
		if err != nil {
			log.Printf("Celery Connection Error:%v", err)
			c.Status(http.StatusInternalServerError)
		}
		celerySndOpinionReqcount()
		_, err = cli.Delay(TaskName, os.Getenv("OPERATION_ADDRESS"), message)
		if err != nil {
			log.Printf("Enqueue Error:%v", err)
			c.Status(http.StatusInternalServerError)
		}
		c.Status(http.StatusOK)
	})
	router.GET("/healthcheck", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return router
}
func main() {
	log.Println("frontend start")
	// exec node-export service
	go exportMetrics()
	err := router().Run(":8080")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

}

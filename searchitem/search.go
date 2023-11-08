package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	"strconv"

	_ "github.com/go-sql-driver/mysql"
	pb "github.com/mockten/mockten_interfaces/searchitem"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"google.golang.org/grpc"
)

const (
	port = ":50051"
)

var (
	searchReqCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_req_total",
		Help: "Total number of requests that have come to search-item",
	})

	searchResCount = promauto.NewCounter(prometheus.CounterOpts{
		Name: "search_res_total",
		Help: "Total number of response that send from serch-item",
	})

	logger *zap.Logger
	db     *sql.DB
)

type server struct {
	pb.UnimplementedSearchItemsServer
}

// Implement SearchItemServer using protocol buffer
func (s *server) SearchItem(ctx context.Context, in *pb.GetSearchItem) (*pb.SearchResponse, error) {
	// logging request log
	logger.Info(getRequestLog(in.GetProductName(), in.GetSellerName(), in.GetExhibitionDate(), in.GetUpdateDate()))

	// increment counter
	searchReqCount.Inc()

	productNameForSearch := in.GetProductName()
	sellerNameForSearch := in.GetSellerName()
	exhibitionDateForSearch := in.GetExhibitionDate()
	updateDateForSearch := in.GetUpdateDate()
	categoryForSearch := strconv.Itoa(int(in.GetCategory()))
	rankingFilterForSearch := in.GetRankingFilter()
	pageForSearch := in.GetPage() //int32

	//Get SellerIDs
	sellerIDs := make([]string, 0)
	var err error
	if len(sellerNameForSearch) > 0 {
		sellerIDs, err = getSellerID(sellerNameForSearch, db)
		if err != nil {
			return nil, err
		}
	}

	// create searchQuery
	searchSQL, countSQL := createSearchSQL(productNameForSearch, sellerIDs, exhibitionDateForSearch, updateDateForSearch, categoryForSearch, rankingFilterForSearch, pageForSearch)

	items, productErr := getProductInfo(db, searchSQL)
	if productErr != nil {
		logger.Error("Search ERROR", zap.Error(productErr))
		return nil, productErr
	}

	total, totalErr := getTotalInfo(db, countSQL)
	if totalErr != nil {
		logger.Error("Search total ERROR", zap.Error(totalErr))
		return nil, totalErr
	}

	logger.Info("Items&Total", zap.Any("Items", items), zap.Any("Total", total))

	// increment counter
	searchResCount.Inc()
	return &pb.SearchResponse{TotalNum: total, Response: items}, nil
}

func main() {
	// set-up logging environment using zap
	var err error

	environment := os.Getenv("MOCKTEN_ENV")

	if environment == "development" || environment == "" {
		config := zap.NewDevelopmentConfig()
		config.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
		logger, err = config.Build()
	} else {
		config := zap.NewProductionConfig()
		config.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
		logger, err = config.Build()
	}

	if err != nil {
		log.Print("failed to set-up zap log in searchitem. \n")
		panic(err)
	}

	logger.Debug("this is development environment.")
	logger.Info("success set-up logging function.")

	defer logger.Sync()

	// Connect DB
	db, err = connectDB()
	if err != nil {
		panic(err)
	}

	defer db.Close()

	// expose /metrics endpoint for observer(by default Prometheus).
	go exportMetrics()

	// start application
	lis, err := net.Listen("tcp", port)
	if err != nil {
		logger.Error("failed to set-up port listen with gRPC.")
	}
	grpcserver := grpc.NewServer()
	pb.RegisterSearchItemsServer(grpcserver, &server{})
	if err := grpcserver.Serve(lis); err != nil {
		logger.Error("failed to set-up application server.")
		panic(err)
	}
}

// connect DB(mysql)
func connectDB() (*sql.DB, error) {
	user := os.Getenv("SECRET_USER")
	pass := os.Getenv("SECRET_PASS")
	sdb := os.Getenv("SECRET_DB")
	table := os.Getenv("SECRET_TABLE")

	mySQLHost := fmt.Sprintf("%s:%s@tcp(%s)/%s", user, pass, sdb, table)
	db, err := sql.Open("mysql", mySQLHost)
	if err = db.Ping(); err != nil {
		logger.Error("failed to connecto database", zap.Error(err))
		return nil, err
	}

	return db, nil
}

func getSellerID(sellerName string, db *sql.DB) ([]string, error) {
	sellerIDs := make([]string, 0)
	searchSellerQuery := "SELECT seller_id FROM SELLER_INFO WHERE seller_name LIKE '%" + sellerName + "%';"
	sellerRows, err := db.Query(searchSellerQuery)
	if err != nil {
		logger.Error("DB Seller Query Error", zap.Error(err))
		return nil, err
	}
	defer sellerRows.Close()

	var sellerID string
	for sellerRows.Next() {
		if err := sellerRows.Scan(&sellerID); err != nil {
			logger.Error("Search Seller Scan Error", zap.Error(err))
			return nil, err
		}
		sellerIDs = append(sellerIDs, sellerID)
	}
	return sellerIDs, nil
}

func createSearchSQL(productNameForSearch string,
	sellerIDs []string,
	exhibitionDateForSearch string,
	updateDateForSearch string,
	categoryForSearch string,
	rankingFilterForSearch int32,
	pageForSearch int32) (string, string) {
	baseSQL := "SELECT product_id,product_name,seller_name,stock,price,image_path,comment,category FROM PRODUCT_INFO_VIEW WHERE PRODUCT_NAME LIKE '%" + productNameForSearch + "%'"
	baseCountSQL := "SELECT COUNT(*) FROM PRODUCT_INFO WHERE PRODUCT_NAME LIKE '%" + productNameForSearch + "%'"
	// SearchItem all
	if len(sellerIDs) > 0 {
		sellerNameQuery := "("
		for i, sellerID := range sellerIDs {
			if i != 0 {
				sellerNameQuery = sellerNameQuery + ","
			}
			sellerNameQuery = sellerNameQuery + "'" + sellerID + "'"
		}
		sellerNameQuery = sellerNameQuery + ")"
		baseSQL = baseSQL + " AND SELLER_ID IN " + sellerNameQuery
		baseCountSQL = baseCountSQL + " AND SELLER_ID IN " + sellerNameQuery
	}
	if len(exhibitionDateForSearch) > 0 {
		baseSQL = baseSQL + " AND TIME=" + exhibitionDateForSearch
		baseCountSQL = baseCountSQL + " AND TIME=" + exhibitionDateForSearch
	}
	if len(updateDateForSearch) > 0 {
		baseSQL = baseSQL + " AND UPDATE_TIME=" + updateDateForSearch
		baseCountSQL = baseCountSQL + " AND UPDATE_TIME=" + updateDateForSearch
	}
	if categoryForSearch != "99" {
		baseSQL = baseSQL + " AND CATEGORY='" + categoryForSearch + "'"
		baseCountSQL = baseCountSQL + " AND CATEGORY='" + categoryForSearch + "'"
	}

	// attach sortString
	sortStr := CreateSortStr(rankingFilterForSearch)
	baseSQL = baseSQL + sortStr

	pagedata := (10 * pageForSearch) - 10
	baseSQL = baseSQL + " LIMIT " + strconv.Itoa(int(pagedata)) + ",10"
	baseSQL = baseSQL + ";"
	baseCountSQL = baseCountSQL + ";"

	logger.Debug("basesQL : " + baseSQL)
	logger.Debug("baseCountSQL : " + baseCountSQL)

	return baseSQL, baseCountSQL
}

func CreateSortStr(filter int32) string {
	switch filter {
	case 1:
		return " ORDER BY price DESC"
	case 2:
		return " ORDER BY price ASC"
	case 3:
		return " ORDER BY rate ASC"
	case 4:
		return " ORDER BY update_date ASC"
	case 5:
		return ""
	}
	return ""
}

func getProductInfo(db *sql.DB, searchSQL string) ([]*pb.ResponseResult, error) {

	items := make([]*pb.ResponseResult, 0)
	rows, err := db.Query(searchSQL)
	if err != nil {
		logger.Error("Search Product Query Error", zap.Error(err))
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var responseResult *pb.ResponseResult = &pb.ResponseResult{}
		if err := rows.Scan(&responseResult.ProductId, &responseResult.ProductName, &responseResult.SellerName, &responseResult.Stocks, &responseResult.Price, &responseResult.ImageUrl, &responseResult.Comment, &responseResult.Category); err != nil {
			logger.Error("Search Scan Error", zap.Error(err))
			return items, err
		}
		items = append(items, responseResult)
		logger.Info("Product info", zap.Any("items", items))
	}

	return items, nil
}

func getTotalInfo(db *sql.DB, countSQL string) (int32, error) {
	var total int32

	rows, err := db.Query(countSQL)
	if err != nil {
		logger.Error("Count Query Error", zap.Error(err))
		return 0, err
	}
	defer rows.Close()

	for rows.Next() {
		if err := rows.Scan(&total); err != nil {
			logger.Error("Count Scan Error", zap.Error(err))
			return 0, err
		}
	}

	return total, nil
}

// for goroutin
func exportMetrics() {
	http.Handle("/metrics", promhttp.Handler())
	http.ListenAndServe(":9100", nil)
}

func getRequestLog(productName string, sellerName string, exhibitionDate string, updateDate string) string {
	return "ProductName: " + productName + ": SellerName" + sellerName + ": ExhibtionName: " + exhibitionDate + ": UpadateDate: " + updateDate + ": Category: " + "\n"
}

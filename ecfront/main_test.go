package main

import (
	"context"
	pb "ecfront/pb"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"google.golang.org/grpc"

	"github.com/stretchr/testify/assert"
)

const (
	searchport = ":50051"
	payport    = ":50052"
	rankport   = ":50053"
)

type searchserver struct {
	pb.UnimplementedSearchItemsServer
}
type rankserver struct {
	pb.UnimplementedRankItemsServer
}
type payserver struct {
	pb.UnimplementedTransactionServer
}

func init() {
	go searchsim()
	go ranksim()
	go paysim()
}
func SearchItemAdd(input []*pb.ResponseResult, Productname string, SellerName string, Stocks int32, Price int32, ImageUrl string, Comment string) (items []*pb.ResponseResult) {
	u, err := uuid.NewRandom()
	if err != nil {
		log.Printf("Generate Transaction Error:%v", err)
	}
	ProductID := u.String()
	responseResult := &pb.ResponseResult{}
	responseResult.ProductId = ProductID
	responseResult.ProductName = Productname
	responseResult.SellerName = SellerName
	responseResult.Stocks = Stocks
	responseResult.Price = Price
	responseResult.ImageUrl = ImageUrl
	responseResult.Comment = Comment
	items = append(input, responseResult)
	return items

}
func RankItemAdd(input []*pb.RankingResult, Productname string, Price int32, ImageUrl string, Category int32) (items []*pb.RankingResult) {
	u, err := uuid.NewRandom()
	if err != nil {
		log.Printf("Generate Transaction Error:%v", err)
	}
	ProductID := u.String()
	responseResult := &pb.RankingResult{}
	responseResult.ProductId = ProductID
	responseResult.Category = Category
	responseResult.ImageUrl = ImageUrl
	responseResult.Price = Price
	responseResult.ProductName = Productname
	items = append(input, responseResult)
	return items

}

// Implement SearchItemServer
func (s *searchserver) SearchItem(ctx context.Context, in *pb.GetSearchItem) (*pb.SearchResponse, error) {
	items := make([]*pb.ResponseResult, 0)
	items = SearchItemAdd(items, "Acoustic", "A Company", 4, 4700, "assets/img/go-portforio-apl-file/img1.jpg", "You can play  anywhere and anywhen")
	items = SearchItemAdd(items, "LesPaul", "B Company", 8, 3900, "assets/img/go-portforio-apl-file/img2.jpg", "The coolest and distorted sound for Rock'n Roll")
	items = SearchItemAdd(items, "Telecaster", "C Company", 7, 2200, "assets/img/go-portforio-apl-file/img3.jpg", "The traditional guitar for a lead guitarlist")
	items = SearchItemAdd(items, "Piano", "D Company", 5, 15000, "assets/img/go-portforio-apl-file/img4.jpg", "The coolest and distorted sound for Rock'n Roll")
	items = SearchItemAdd(items, "Drum", "E Company", 10, 9700, "assets/img/go-portforio-apl-file/img5.jpg", "Tightly woven black mesh drum")
	items = SearchItemAdd(items, "Bass", "F Company", 22, 5300, "assets/img/go-portforio-apl-file/img6.jpg", "This is the modern shaped bass, it has a linden body, rosewood fretboard and is currently available in 2 colorways: Black and Sunburst")
	items = SearchItemAdd(items, "Acoustic", "A Company", 4, 4700, "assets/img/go-portforio-apl-file/img1.jpg", "You can play  anywhere and anywhen")
	items = SearchItemAdd(items, "LesPaul", "B Company", 8, 3900, "assets/img/go-portforio-apl-file/img2.jpg", "The coolest and distorted sound for Rock'n Roll")
	items = SearchItemAdd(items, "Telecaster", "C Company", 7, 2200, "assets/img/go-portforio-apl-file/img3.jpg", "The traditional guitar for a lead guitarlist")
	items = SearchItemAdd(items, "Piano", "D Company", 5, 15000, "assets/img/go-portforio-apl-file/img4.jpg", "The coolest and distorted sound for Rock'n Roll")
	return &pb.SearchResponse{Response: items, TotalNum: 112}, nil
}

// Implement RankItemServer
func (s *rankserver) RankItem(ctx context.Context, in *pb.GetRankItem) (*pb.RankResponse, error) {
	items := make([]*pb.RankingResult, 0)
	items = RankItemAdd(items, "Acoustic", 4700, "assets/img/go-portforio-apl-file/img1.jpg", 1)
	items = RankItemAdd(items, "LesPaul", 3900, "assets/img/go-portforio-apl-file/img2.jpg", 1)
	items = RankItemAdd(items, "Telecaster", 2200, "assets/img/go-portforio-apl-file/img3.jpg", 2)
	items = RankItemAdd(items, "Piano", 15000, "assets/img/go-portforio-apl-file/img4.jpg", 3)
	items = RankItemAdd(items, "Drum", 9700, "assets/img/go-portforio-apl-file/img5.jpg", 99)
	items = RankItemAdd(items, "Bass", 5300, "assets/img/go-portforio-apl-file/img6.jpg", 99)
	items = RankItemAdd(items, "Acoustic", 4700, "assets/img/go-portforio-apl-file/img1.jpg", 4)
	items = RankItemAdd(items, "LesPaul", 3900, "assets/img/go-portforio-apl-file/img2.jpg", 5)
	items = RankItemAdd(items, "Telecaster", 2200, "assets/img/go-portforio-apl-file/img3.jpg", 6)
	items = RankItemAdd(items, "Piano", 15000, "assets/img/go-portforio-apl-file/img4.jpg", 7)
	return &pb.RankResponse{Response: items, TotalNum: 122}, nil
}

// Implement RankItemServer
func (s *payserver) PayItem(ctx context.Context, in *pb.RegisterRequest) (*pb.RegisterResponse, error) {
	Response := &pb.RegisterResponse{}
	ProductList := [...]string{"test1", "test2"}
	eachStatus := make(map[string]*pb.EachResponse)
	for _, product := range ProductList {
		EachResponse := &pb.EachResponse{}
		EachResponse.Status = "OK"
		EachResponse.Msg = "OK"
		eachStatus[product] = EachResponse
	}
	Response.Response = eachStatus
	Response.Status = "OK"
	return Response, nil
}
func searchsim() {
	lis, err := net.Listen("tcp", searchport)
	if err != nil {
		fmt.Printf("failed to listen: %v", err)
	}
	grpcserver := grpc.NewServer()
	pb.RegisterSearchItemsServer(grpcserver, &searchserver{})
	if err := grpcserver.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func ranksim() {
	lis, err := net.Listen("tcp", rankport)
	if err != nil {
		fmt.Printf("failed to listen: %v", err)
	}
	grpcserver := grpc.NewServer()
	pb.RegisterRankItemsServer(grpcserver, &rankserver{})
	if err := grpcserver.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func paysim() {
	lis, err := net.Listen("tcp", payport)
	if err != nil {
		fmt.Printf("failed to listen: %v", err)
	}
	grpcserver := grpc.NewServer()
	pb.RegisterTransactionServer(grpcserver, &payserver{})
	if err := grpcserver.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}

func PostForm(uri string, param url.Values, router *gin.Engine) ([]byte, *httptest.ResponseRecorder) {

	// Construct a post request
	req := httptest.NewRequest("POST", uri, strings.NewReader(param.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Initialize response
	w := httptest.NewRecorder()

	// call the corresponding handler interface
	router.ServeHTTP(w, req)

	// Extract response
	result := w.Result()
	defer result.Body.Close()

	// read response body
	body, _ := ioutil.ReadAll(result.Body)
	return body, w
}
func PatchForm(uri string, param url.Values, router *gin.Engine) ([]byte, *httptest.ResponseRecorder) {

	// Construct a post request
	req := httptest.NewRequest("PATCH", uri, strings.NewReader(param.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Initialize response
	w := httptest.NewRecorder()

	// call the corresponding handler interface
	router.ServeHTTP(w, req)

	// Extract response
	result := w.Result()
	defer result.Body.Close()

	// read response body
	body, _ := ioutil.ReadAll(result.Body)
	return body, w
}

func TestUrlHome001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/home", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}
func TestUrlLogin001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/login", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 301, w.Code)
}

func TestUrlLogin101(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/login", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 500, w.Code)
}
func TestUrlLogout001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/logout", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 301, w.Code)
}
func TestUrlLogout101(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("POST", "/logout", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 500, w.Code)
}

func TestUrlWatchlist001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/watchlist?page=1", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

func TestUrlWatchlist101(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/watchlist", nil)
	router.ServeHTTP(w, req)
	assert.Equal(t, 200, w.Code)
}
func TestUrlWatch001(t *testing.T) {
	router := router()
	values := url.Values{
		"id":        {"1346ef94-f4e9-4d64-83b8-8789e657b236"},
		"name":      {"test_product"},
		"image_url": {"test_url"},
		"price":     {"1234"},
	}
	_, w := PostForm("/watch", values, router)
	assert.Equal(t, 200, w.Code)
}

//PATCH
func TestUrlWatch011(t *testing.T) {
	router := router()
	values := url.Values{
		"id":        {"e1a48d42-0f66-47e5-9068-0faa910b60d1"},
		"name":      {"test_product"},
		"image_url": {"test_url"},
		"price":     {"1234"},
	}
	_, w := PatchForm("/watch", values, router)
	assert.Equal(t, 200, w.Code)
}
func TestUrlOpinion001(t *testing.T) {
	router := router()
	values := url.Values{
		"message": {"hello"},
	}
	_, w := PostForm("/opinion", values, router)
	assert.Equal(t, 200, w.Code)
}
func TestUrlSearch001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/search", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

//POST
func TestUrlSearch011(t *testing.T) {
	router := router()
	values := url.Values{
		"item": {"test_product"},
	}
	_, w := PostForm("/search", values, router)
	assert.Equal(t, 200, w.Code)
}
func TestUrlRanking001(t *testing.T) {
	router := router()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/ranking?category=1", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
}

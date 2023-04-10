package main

import (
	"fmt"
	"log"
	"net/http"
	"unicode/utf8"

	pb "pb"

	"github.com/gin-gonic/gin"
	"golang.org/x/net/context"
	"google.golang.org/grpc"
)

const (
	address string = "localhost:50051"
)

// for client
func main() {

	router := gin.Default()
	router.GET("/test", func(c *gin.Context) {
		// get the query string form Request URL
		query := c.Request.URL.Query().Encode()
		queryLen := utf8.RuneCountInString(query)

		if query[queryLen-1] == '=' {
			query = query[:queryLen-1]
		}
		fmt.Printf("query is %d", query)
		//Set up a connection to the server.
		conn, err := grpc.Dial(address, grpc.WithInsecure())
		if err != nil {
			log.Println("did not connect: %v", err)
		}
		defer conn.Close()
		con := pb.NewSearchItemsClient(conn)
		//response
		r, err := con.SearchItem(context.Background(), &pb.GetSearchItem{
			ProductName:    "macbook",
			SellerName:     "Ryo Kiuchi",
			ExhibitionDate: "",
			UpdateDate:     "",
			Category:       1,
			RankingFilter:  3,
			Page:           1})
		if err != nil {
			log.Println("could not resolve request parameter : %v", err)
		}

		log.Printf("RCV(gRPC): %s", r.Response[0].ProductName)
		// Return the response value from grpcServer
		c.String(http.StatusOK, r.Response[0].ProductName+"\n")
		log.Printf("SND(HTTPS): %s", r.Response[0].ProductName)

	})

	router.Run(":9000")
}

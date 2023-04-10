// Package main implements a client for Greeter service.
package main

import (
	"context"
	"log"
	"net"
	"testing"
	"time"

	pb "ranking/pb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"
)

const (
	address = "localhost:50053"
	bufSize = 1024 * 1024
)

var lis *bufconn.Listener

func init() {
	lis = bufconn.Listen(bufSize)
	s := grpc.NewServer()
	pb.RegisterRankItemsServer(s, &server{})
	go func() {
		if err := s.Serve(lis); err != nil {
			log.Fatal(err)
		}
	}()
}

func bufDialer(ctx context.Context, address string) (net.Conn, error) {
	return lis.Dial()
}

func TestTransaction001(t *testing.T) {
	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(bufDialer), grpc.WithInsecure())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	registerRequest := &pb.GetRankItem{}
	registerRequest.Category = 0
	registerRequest.Page = 1
	c := pb.NewRankItemsClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	r, err := c.RankItem(ctx, registerRequest)
	if err != nil {
		t.Fatalf("could not greet: %v", err)
	}
	t.Logf("Response is %s", r.Response)
}

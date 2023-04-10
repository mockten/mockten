// Package main implements a client for Greeter service.
package main

import (
	"context"
	"log"
	"net"
	"testing"
	"time"

	pb "ecpay/interface"

	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"
)

const (
	address = "localhost:50052"
	bufSize = 1024 * 1024
)

var lis *bufconn.Listener

func init() {
	lis = bufconn.Listen(bufSize)
	s := grpc.NewServer()
	pb.RegisterTransactionServer(s, &server{})
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
	productId := "350f48f8-ea53-442e-9cd9-82e968f3a4dd"
	eachRequest := &pb.EachRequest{}
	eachRequest.DealStock = 3
	eachRequest.TotalAmount = 4
	registerRequest := &pb.RegisterRequest{}
	registerRequest.Address = "test@mail.com"
	registerRequest.CardNum = "4242424242424242"
	registerRequest.ExpMonth = "12"
	registerRequest.ExpYear = "2021"
	registerRequest.Cvc = "123"
	registerRequest.Name = "Taro"
	registerRequest.PaymentType = "Stripe"
	registerRequest.Itemurl = "url1"
	registerRequest.Itemcategory = 1
	registerRequest.Itemname = "Product1"
	registerRequest.Itemprice = 900
	registerRequest.Request = map[string]*pb.EachRequest{productId: eachRequest}
	c := pb.NewTransactionClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	r, err := c.CreateTransaction(ctx, registerRequest)
	if err != nil {
		t.Fatalf("could not greet: %v", err)
	}
	if r.Status != "OK" {
		t.Fatalf("Status must be 'OK'(%v)", r.Status)
	}
	t.Logf("Status is %s", r.Status)
	t.Logf("Response is %s", r.Response)
	for _, value := range r.Response {
		if value.Status != "OK" {
			t.Fatalf("Transactions Status must be 'OK'(%v)", value.Status)
		}
		if value.Msg != "OK" {
			t.Fatalf("message description must be 'OK'(%v)", value.Msg)
		}
	}
}

func TestTransaction002(t *testing.T) {
	ctx := context.Background()
	conn, err := grpc.DialContext(ctx, "bufnet", grpc.WithContextDialer(bufDialer), grpc.WithInsecure())
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	productId := "350f48f8-ea53-442e-9cd9-82e968f3a4de"
	eachRequest := &pb.EachRequest{}
	eachRequest.DealStock = 3
	eachRequest.TotalAmount = 4
	registerRequest := &pb.RegisterRequest{}
	registerRequest.Address = "test@mail.com"
	registerRequest.CardNum = "4242424242424242"
	registerRequest.ExpMonth = "12"
	registerRequest.ExpYear = "2021"
	registerRequest.Cvc = "123"
	registerRequest.Name = "Taro"
	registerRequest.PaymentType = "Stripe"
	registerRequest.Itemurl = "url2"
	registerRequest.Itemcategory = 1
	registerRequest.Itemname = "Product2"
	registerRequest.Itemprice = 900
	registerRequest.Request = map[string]*pb.EachRequest{productId: eachRequest}
	c := pb.NewTransactionClient(conn)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	r, err := c.CreateTransaction(ctx, registerRequest)
	if err != nil {
		t.Fatalf("could not greet: %v", err)
	}
	if r.Status != "OK" {
		t.Fatalf("Status must be 'OK'(%v)", r.Status)
	}
	t.Logf("Status is %s", r.Status)
	t.Logf("Response is %s", r.Response)
	for _, value := range r.Response {
		if value.Status != "NG" {
			t.Fatalf("Transactions Status must be 'NG'(%v)", value.Status)
		}
		if value.Msg != "GetName Error" {
			t.Fatalf("message description must be 'GetName Error'(%v)", value.Msg)
		}
	}
}

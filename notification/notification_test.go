package main

import (
	"log"
	"os"
	"os/signal"
	"testing"
	"time"

	"github.com/yabamuro/gocelery"
	"gopkg.in/ini.v1"
)

const (
	TestQueue = "notification"
)

func init() {
	cfg, err := ini.Load("config.ini")
	if err != nil {
		log.Fatalf("Initialization Error:%v", err)
		panic(err.Error())
	}
	Config = ConfigList{
		FromUser:     cfg.Section("api").Key("from_user").String(),
		FromUserName: cfg.Section("api").Key("from_username").String(),
		ToUserName:   cfg.Section("api").Key("to_username").String(),
		Subject:      cfg.Section("api").Key("subject").String(),
		Concurrency:  cfg.Section("api").Key("concurrency").MustInt(),
	}
}

func TestNotification001(t *testing.T) {
	cli, _ := gocelery.NewCeleryClient(
		gocelery.NewRedisCeleryBroker(os.Getenv("REIDS_HOST"), TestQueue),
		gocelery.NewRedisCeleryBackend(os.Getenv("REIDS_HOST")),
		Config.Concurrency,
	)
	cli.Register("worker.notification", sendMail)
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)

	cli.StartWorker()
	defer cli.StopWorker()
	t.Logf("worker start: concurrency=%v\n", Config.Concurrency)
	asyncResult, err := cli.Delay(TaskName, os.Getenv("TEST_ADDRESS"), "UT001")
	if err != nil {
		t.Logf("Enqueue Error:%v", err)
	}
	res, err := asyncResult.Get(10 * time.Second)
	if err != nil {
		t.Logf("Get Value Error:%v", err)
	}
	if res != float64(200) {
		t.Fatalf("StatusCode must be 200(%v)", res)
	}
}

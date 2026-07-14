package main

import (
	"os"
	"testing"
	"time"
)

func TestGetenvInt(t *testing.T) {
	os.Unsetenv("MOCKTEN_TEST_INT")
	if got := getenvInt("MOCKTEN_TEST_INT", 42); got != 42 {
		t.Errorf("default not returned: got %d want 42", got)
	}
	os.Setenv("MOCKTEN_TEST_INT", "7")
	defer os.Unsetenv("MOCKTEN_TEST_INT")
	if got := getenvInt("MOCKTEN_TEST_INT", 42); got != 7 {
		t.Errorf("env value not used: got %d want 7", got)
	}
}

func TestGetenvDurationSeconds(t *testing.T) {
	os.Unsetenv("MOCKTEN_TEST_DUR")
	if got := getenvDurationSeconds("MOCKTEN_TEST_DUR", 5); got != 5*time.Second {
		t.Errorf("default duration wrong: got %v want 5s", got)
	}
}

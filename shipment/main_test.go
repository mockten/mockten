package main

import (
	"os"
	"testing"
)

func TestIsTestMode(t *testing.T) {
	orig := os.Getenv("TEST_MODE")
	defer os.Setenv("TEST_MODE", orig)

	os.Setenv("TEST_MODE", "true")
	if !isTestMode() {
		t.Error("expected isTestMode() to be true when TEST_MODE=true")
	}
	os.Setenv("TEST_MODE", "false")
	if isTestMode() {
		t.Error("expected isTestMode() to be false when TEST_MODE=false")
	}
	os.Unsetenv("TEST_MODE")
	if isTestMode() {
		t.Error("expected isTestMode() to be false when TEST_MODE is unset")
	}
}

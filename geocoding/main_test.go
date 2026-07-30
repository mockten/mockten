package main

import (
	"regexp"
	"testing"
)

func TestGenerateUUID(t *testing.T) {
	re := regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	seen := map[string]bool{}
	for i := 0; i < 100; i++ {
		u := generateUUID()
		if !re.MatchString(u) {
			t.Fatalf("generateUUID() = %q, not a UUID-shaped string", u)
		}
		if seen[u] {
			t.Fatalf("generateUUID() produced a duplicate: %q", u)
		}
		seen[u] = true
	}
}

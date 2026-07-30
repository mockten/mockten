package main

import "testing"

func TestRankingZSetKey(t *testing.T) {
	cases := []struct {
		month, category string
		wantKey         string
		wantID          int
	}{
		{"2025-01", "all", "ranking:2025-01:all", 99},
		{"2025-01", "3", "ranking:2025-01:3", 3},
		{"2025-12", "10", "ranking:2025-12:10", 10},
		{"2025-01", "notanumber", "ranking:2025-01:notanumber", 0},
	}
	for _, c := range cases {
		key, id := rankingZSetKey(c.month, c.category)
		if key != c.wantKey || id != c.wantID {
			t.Errorf("rankingZSetKey(%q,%q) = (%q,%d), want (%q,%d)", c.month, c.category, key, id, c.wantKey, c.wantID)
		}
	}
}

package cartstore

import (
	"testing"

	"github.com/mockten/mockten/cart/internal/model"
)

func TestFindItemIndex(t *testing.T) {
	items := []model.RedisCartItem{
		{ID: "p1:standard"},
		{ID: "p2:express"},
		{ID: "p3:standard"},
	}
	cases := []struct {
		id   string
		want int
	}{
		{"p1:standard", 0},
		{"p2:express", 1},
		{"p3:standard", 2},
		{"missing", -1},
		{"", -1},
	}
	for _, c := range cases {
		if got := findItemIndex(items, c.id); got != c.want {
			t.Errorf("findItemIndex(%q) = %d, want %d", c.id, got, c.want)
		}
	}
	if got := findItemIndex(nil, "p1:standard"); got != -1 {
		t.Errorf("findItemIndex(nil,...) = %d, want -1", got)
	}
}

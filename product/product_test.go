package main

import "testing"

func TestBearerTokenFromHeader(t *testing.T) {
	cases := []struct {
		header    string
		wantToken string
		wantOK    bool
	}{
		{"Bearer abc.def.ghi", "abc.def.ghi", true},
		{"bearer xyz", "xyz", true},
		{"BEARER   spaced", "spaced", true},
		{"", "", false},
		{"Basic abc", "", false},
		{"Bearer ", "", false},
		{"justtoken", "", false},
	}
	for _, c := range cases {
		tok, ok := bearerTokenFromHeader(c.header)
		if tok != c.wantToken || ok != c.wantOK {
			t.Errorf("bearerTokenFromHeader(%q) = (%q,%v), want (%q,%v)", c.header, tok, ok, c.wantToken, c.wantOK)
		}
	}
}

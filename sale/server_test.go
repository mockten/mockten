package main

import "testing"

func TestMax1(t *testing.T) {
	cases := []struct {
		in, want int
	}{
		{-5, 1}, {0, 1}, {1, 1}, {2, 2}, {100, 100},
	}
	for _, c := range cases {
		if got := max1(c.in); got != c.want {
			t.Errorf("max1(%d) = %d, want %d", c.in, got, c.want)
		}
	}
}

func TestEUCountries(t *testing.T) {
	inEU := []string{"DE", "FR", "IT", "ES", "NL", "SE"}
	for _, c := range inEU {
		if !euCountries[c] {
			t.Errorf("expected %s to be classified as EU", c)
		}
	}
	notEU := []string{"JP", "SG", "US", "GB", "CN", ""}
	for _, c := range notEU {
		if euCountries[c] {
			t.Errorf("expected %s to NOT be classified as EU", c)
		}
	}
}

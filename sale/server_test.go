package main

import "testing"

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

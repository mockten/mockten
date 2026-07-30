package main

import (
	"encoding/base64"
	"encoding/json"
	"testing"
)

func makeToken(claims map[string]string) string {
	enc := func(v any) string {
		b, _ := json.Marshal(v)
		return base64.RawURLEncoding.EncodeToString(b)
	}
	return enc(map[string]string{"alg": "none"}) + "." + enc(claims) + ".sig"
}

func TestParseUserFromAuthHeader(t *testing.T) {
	t.Run("email claim wins", func(t *testing.T) {
		tok := makeToken(map[string]string{"email": "a@x.io", "preferred_username": "alice", "sub": "s1"})
		u := parseUserFromAuthHeader("Bearer " + tok)
		if u.UserID != "a@x.io" || u.Email != "a@x.io" {
			t.Errorf("got %+v", u)
		}
	})

	t.Run("falls back to preferred_username", func(t *testing.T) {
		tok := makeToken(map[string]string{"preferred_username": "bob", "sub": "s2"})
		u := parseUserFromAuthHeader("Bearer " + tok)
		if u.UserID != "bob" || u.Email != "bob@example.com" {
			t.Errorf("got %+v", u)
		}
	})

	t.Run("falls back to sub for user id", func(t *testing.T) {
		tok := makeToken(map[string]string{"sub": "s3"})
		u := parseUserFromAuthHeader("Bearer " + tok)
		if u.UserID != "s3" {
			t.Errorf("expected UserID s3, got %+v", u)
		}
	})

	t.Run("missing header returns mock user", func(t *testing.T) {
		u := parseUserFromAuthHeader("")
		if u.UserID != "testuser@example.com" {
			t.Errorf("expected mock user, got %+v", u)
		}
	})

	t.Run("malformed token returns mock user", func(t *testing.T) {
		u := parseUserFromAuthHeader("Bearer not-a-jwt")
		if u.UserID != "testuser@example.com" {
			t.Errorf("expected mock user, got %+v", u)
		}
	})
}

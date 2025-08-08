package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
)

type Config struct {
	NominatimURL   string            `json:"nominatim_url"`
	UserAgent      string            `json:"user_agent"`
	CountryMapping map[string]string `json:"country_mapping"`
	MySQL          struct {
		Host   string `json:"host"`
		User   string `json:"user"`
		Pass   string `json:"pass"`
		DB     string `json:"db"`
		Params string `json:"params"`
	} `json:"mysql"`
}

type GeocodeRequest struct {
	UserID       string `json:"user_id"`
	PostalCode   string `json:"postal_code"`
	Prefecture   string `json:"prefecture"`
	City         string `json:"city"`
	Town         string `json:"town"`
	BuildingName string `json:"building_name"`
	RoomNumber   string `json:"room_number"`
	CountryCode  string `json:"country_code"`
}

var cfg Config
var db *sql.DB

func loadConfig(path string) {
	f, err := os.Open(path)
	if err != nil {
		log.Fatalf("Config error: %v", err)
	}
	defer f.Close()
	if err := json.NewDecoder(f).Decode(&cfg); err != nil {
		log.Fatalf("Config decode error: %v", err)
	}
	if strings.TrimSpace(cfg.UserAgent) == "" {
		log.Fatalf("Config error: user_agent is empty")
	}
	if strings.TrimSpace(cfg.NominatimURL) == "" {
		cfg.NominatimURL = "https://nominatim.openstreetmap.org/search"
	}
	if cfg.CountryMapping == nil {
		cfg.CountryMapping = map[string]string{}
	}
	if strings.TrimSpace(cfg.MySQL.Params) == "" {
		cfg.MySQL.Params = "parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci"
	}
}

func initDBForever() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s)/%s?%s",
		cfg.MySQL.User,
		cfg.MySQL.Pass,
		cfg.MySQL.Host,
		cfg.MySQL.DB,
		cfg.MySQL.Params,
	)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}

	db.SetConnMaxLifetime(10 * time.Minute)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)

	// Infinite retry with exponential backoff (1s -> 10s cap) + jitter
	rand.Seed(time.Now().UnixNano())
	delay := time.Second
	maxDelay := 10 * time.Second
	attempt := 0

	for {
		attempt++
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		err = db.PingContext(ctx)
		cancel()

		if err == nil {
			log.Printf("DB connected after %d attempt(s)", attempt)
			return
		}

		log.Printf("DB ping failed (attempt %d): %v", attempt, err)
		jitter := time.Duration(rand.Int63n(int64(delay / 2)))
		sleepFor := delay + jitter
		if sleepFor > maxDelay {
			sleepFor = maxDelay
		}
		log.Printf("Retrying DB in %s ...", sleepFor)
		time.Sleep(sleepFor)

		// backoff
		delay = time.Duration(float64(delay) * 1.7)
		if delay > maxDelay {
			delay = maxDelay
		}
	}
}

func buildParams(req GeocodeRequest) url.Values {
	p := url.Values{}
	p.Set("format", "jsonv2")
	p.Set("limit", "1")
	p.Set("accept-language", "en")

	cc := strings.ToLower(strings.TrimSpace(req.CountryCode))
	if cc != "" {
		p.Set("countrycodes", cc) // bias by ISO2
	}
	if cn, ok := cfg.CountryMapping[cc]; ok && strings.TrimSpace(cn) != "" {
		p.Set("country", cn)
	}

	// street: use town only (do not append building/room)
	if s := strings.TrimSpace(req.Town); s != "" {
		p.Set("street", s)
	}

	// state/prefecture
	if s := strings.TrimSpace(req.Prefecture); s != "" {
		p.Set("state", s)
	}

	city := strings.TrimSpace(req.City)
	if cc == "jp" {
		// JP: county=ward, city handling for Tokyo
		if city != "" {
			p.Set("county", strings.TrimSuffix(city, " City"))
		}
		if strings.EqualFold(req.Prefecture, "Tokyo") {
			p.Set("city", "Tokyo")
		} else if city != "" {
			p.Set("city", strings.TrimSuffix(city, " City"))
		}
		// Do not send postal on first try for JP
	} else {
		if city != "" {
			p.Set("city", city)
		}
		if z := strings.TrimSpace(req.PostalCode); z != "" {
			p.Set("postalcode", z)
		}
	}

	return p
}

func geocodeOnce(params url.Values) (lat string, lon string, found bool, err error) {
	req, err := http.NewRequest(http.MethodGet, cfg.NominatimURL+"?"+params.Encode(), nil)
	if err != nil {
		return "", "", false, err
	}
	req.Header.Set("User-Agent", cfg.UserAgent)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", "", false, err
	}
	defer resp.Body.Close()

	b, _ := io.ReadAll(resp.Body)
	var items []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	if err := json.Unmarshal(b, &items); err != nil {
		return "", "", false, err
	}
	if len(items) == 0 {
		return "", "", false, nil
	}
	return items[0].Lat, items[0].Lon, true, nil
}

func insertGeo(in GeocodeRequest, latStr, lonStr string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var lat, lon sql.NullFloat64
	if v, err := strconv.ParseFloat(latStr, 64); err == nil {
		lat = sql.NullFloat64{Float64: v, Valid: true}
	}
	if v, err := strconv.ParseFloat(lonStr, 64); err == nil {
		lon = sql.NullFloat64{Float64: v, Valid: true}
	}

	q := `
INSERT INTO Geo (
  user_id, country_code, postal_code, prefecture, city, town, building_name, room_number, latitude, longitude
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
`
	_, err := db.ExecContext(ctx, q,
		in.UserID,
		strings.ToLower(strings.TrimSpace(in.CountryCode)),
		in.PostalCode,
		in.Prefecture,
		in.City,
		in.Town,
		in.BuildingName,
		in.RoomNumber,
		lat, lon,
	)
	if err != nil {
		if me, ok := err.(*mysql.MySQLError); ok && me.Number == 1062 {
			log.Printf("Duplicate user_id %q; skipping insert.", in.UserID)
			return nil
		}
		return err
	}
	return nil
}

func geocodeHandler(w http.ResponseWriter, r *http.Request) {
	var reqBody GeocodeRequest
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	params := buildParams(reqBody)
	lat, lon, found, err := geocodeOnce(params)
	if err != nil {
		log.Printf("Geocode error: %v", err)
		w.WriteHeader(http.StatusOK)
		return
	}

	if !found && strings.ToLower(reqBody.CountryCode) == "jp" && strings.TrimSpace(reqBody.PostalCode) != "" {
		params.Set("postalcode", strings.TrimSpace(reqBody.PostalCode))
		time.Sleep(1100 * time.Millisecond)
		lat, lon, found, err = geocodeOnce(params)
		if err != nil {
			log.Printf("Geocode fallback error: %v", err)
			w.WriteHeader(http.StatusOK)
			return
		}
	}

	if found {
		url := fmt.Sprintf("https://www.google.com/maps?q=%s,%s", lat, lon)
		fmt.Println("Geocode Result:", url)
		if err := insertGeo(reqBody, lat, lon); err != nil {
			log.Printf("DB insert error: %v", err)
		}
	} else {
		fmt.Println("Geocode Result: NOT_FOUND")
	}

	w.WriteHeader(http.StatusOK)
}

func main() {
	loadConfig("config.json")
	initDBForever()

	http.HandleFunc("/profile", geocodeHandler)
	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

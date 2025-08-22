package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
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

type Product struct {
	GeoID     string
	Country   string
	Latitude  float64
	Longitude float64
}

type UserGeo struct {
	Country   string
	Latitude  float64
	Longitude float64
}

type Node struct {
	ID        string
	Latitude  float64
	Longitude float64
}

type ShippingDomesticResponse struct {
	StandardFee float64 `json:"standard_fee"`
	ExpressFee  float64 `json:"express_fee"`
}

type ShippingInternationalResponse struct {
	AirStandardFee float64 `json:"air_standard_fee,omitempty"`
	AirExpressFee  float64 `json:"air_express_fee,omitempty"`
	SeaStandardFee float64 `json:"sea_standard_fee,omitempty"`
	SeaExpressFee  float64 `json:"sea_express_fee,omitempty"`
	Message        string  `json:"message,omitempty"`
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

func initDBWait() {
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
		p.Set("countrycodes", cc)
	}
	if cn, ok := cfg.CountryMapping[cc]; ok && strings.TrimSpace(cn) != "" {
		p.Set("country", cn)
	}
	if s := strings.TrimSpace(req.Town); s != "" {
		p.Set("street", s)
	}
	if s := strings.TrimSpace(req.Prefecture); s != "" {
		p.Set("state", s)
	}

	city := strings.TrimSpace(req.City)
	if cc == "jp" {
		if city != "" {
			p.Set("county", strings.TrimSuffix(city, " City"))
		}
		if strings.EqualFold(req.Prefecture, "Tokyo") {
			p.Set("city", "Tokyo")
		} else if city != "" {
			p.Set("city", strings.TrimSuffix(city, " City"))
		}
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
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  country_code = VALUES(country_code),
  postal_code  = VALUES(postal_code),
  prefecture   = VALUES(prefecture),
  city         = VALUES(city),
  town         = VALUES(town),
  building_name= VALUES(building_name),
  room_number  = VALUES(room_number),
  latitude     = VALUES(latitude),
  longitude    = VALUES(longitude);
`
	_, err := db.ExecContext(ctx, q,
		in.UserID,
		strings.ToUpper(strings.TrimSpace(in.CountryCode)),
		in.PostalCode,
		in.Prefecture,
		in.City,
		in.Town,
		in.BuildingName,
		in.RoomNumber,
		lat, lon,
	)
	return err
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

// ===== Shipping helpers (DB) =====

func getProductLocation(productID string) (*Product, error) {
	q := `
SELECT p.geo_id, g.country_code, g.latitude, g.longitude
FROM Product p
JOIN Geo g ON p.geo_id = g.user_id
WHERE p.product_id = ?
`
	var p Product
	err := db.QueryRow(q, productID).Scan(&p.GeoID, &p.Country, &p.Latitude, &p.Longitude)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func getUserLocation(userID string) (*UserGeo, error) {
	q := `
SELECT country_code, latitude, longitude
FROM Geo
WHERE user_id = ?
`
	var g UserGeo
	err := db.QueryRow(q, userID).Scan(&g.Country, &g.Latitude, &g.Longitude)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func getShippingRates(country string, distance float64) (float64, float64, error) {
	q := `
SELECT shipping_type, rate_per_10km
FROM ShippingRate
WHERE country_code = ?
`
	rows, err := db.Query(q, strings.ToUpper(country))
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	rates := map[string]float64{}
	for rows.Next() {
		var t string
		var rate float64
		if err := rows.Scan(&t, &rate); err != nil {
			return 0, 0, err
		}
		rates[t] = rate
	}
	standard := rates["standard"] * (distance / 10)
	express := rates["express"] * (distance / 10)
	return round2(standard), round2(express), nil
}

func getClosestAirport(country string, lat, lon float64) (Node, float64, error) {
	q := `
SELECT user_id, latitude, longitude
FROM Geo
WHERE UPPER(country_code) = ?
  AND building_name LIKE '%Airport%'
`
	rows, err := db.Query(q, strings.ToUpper(country))
	if err != nil {
		return Node{}, 0, err
	}
	defer rows.Close()

	var closest Node
	min := math.MaxFloat64
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.Latitude, &n.Longitude); err != nil {
			continue
		}
		d := distanceKM(lat, lon, n.Latitude, n.Longitude)
		if d < min {
			min = d
			closest = n
		}
	}
	return closest, min, nil
}

func getClosestPort(country string, lat, lon float64) (Node, float64, error) {
	q := `
SELECT user_id, latitude, longitude
FROM Geo
WHERE UPPER(country_code) = ?
  AND (building_name LIKE '%Port%' OR building_name LIKE '%Terminal%')
`
	rows, err := db.Query(q, strings.ToUpper(country))
	if err != nil {
		return Node{}, 0, err
	}
	defer rows.Close()

	var closest Node
	min := math.MaxFloat64
	for rows.Next() {
		var n Node
		if err := rows.Scan(&n.ID, &n.Latitude, &n.Longitude); err != nil {
			continue
		}
		d := distanceKM(lat, lon, n.Latitude, n.Longitude)
		if d < min {
			min = d
			closest = n
		}
	}
	return closest, min, nil
}

func getDomesticFlightFee(originCode, destCode string) (float64, error) {
	q := `
SELECT cost_usd
FROM DomesticAirCost
WHERE origin = ? AND destination = ?
`
	var fee float64
	err := db.QueryRow(q, originCode, destCode).Scan(&fee)
	if err != nil {
		return 0, err
	}
	return fee, nil
}

func getInternationalAirFee(originAirport, destAirport string) (float64, error) {
	q := `
SELECT cost_usd
FROM AirCost
WHERE origin_airport_code = ? AND destination_airport_code = ?
`
	var fee float64
	err := db.QueryRow(q, strings.ToUpper(originAirport), strings.ToUpper(destAirport)).Scan(&fee)
	if err != nil {
		return 0, err
	}
	return fee, nil
}

func getSeaFreightFee(originCountry, destCountry string) (float64, error) {
	q := `
SELECT cost_usd
FROM SeaCost
WHERE origin_country_code = ? AND destination_country_code = ?
`
	var fee float64
	err := db.QueryRow(q, strings.ToUpper(originCountry), strings.ToUpper(destCountry)).Scan(&fee)
	if err != nil {
		return 0, err
	}
	return fee, nil
}

// ===== Shipping math / utils =====

func distanceKM(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371.0
	rad := func(d float64) float64 { return d * math.Pi / 180 }
	dLat := rad(lat2 - lat1)
	dLon := rad(lon2 - lon1)
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(rad(lat1))*math.Cos(rad(lat2))*math.Sin(dLon/2)*math.Sin(dLon/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

func round2(v float64) float64 {
	r, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", v), 64)
	return r
}

// ===== Shipping handlers =====

func shippingHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.URL.Query().Get("user_id")
	productID := r.URL.Query().Get("product_id")
	if userID == "" || productID == "" {
		http.Error(w, "Missing user_id or product_id", http.StatusBadRequest)
		return
	}

	product, err := getProductLocation(productID)
	if err != nil {
		http.Error(w, "Product not found", http.StatusInternalServerError)
		return
	}
	user, err := getUserLocation(userID)
	if err != nil {
		http.Error(w, "User location not found", http.StatusInternalServerError)
		return
	}

	if !strings.EqualFold(product.Country, user.Country) {
		handleInternational(w, product, user)
		return
	}
	handleDomestic(w, product, user)
}

func handleDomestic(w http.ResponseWriter, product *Product, user *UserGeo) {
	fmt.Println("Domestic delivery")

	direct := distanceKM(product.Latitude, product.Longitude, user.Latitude, user.Longitude)
	origA, dOrigA, _ := getClosestAirport(product.Country, product.Latitude, product.Longitude)
	destA, dDestA, _ := getClosestAirport(user.Country, user.Latitude, user.Longitude)

	fmt.Printf("Direct distance: %.2f km\n", round2(direct))
	fmt.Printf("Origin nearest airport: %s (%.2f km)\n", origA.ID, round2(dOrigA))
	fmt.Printf("Destination nearest airport: %s (%.2f km)\n", destA.ID, round2(dDestA))

	roadStd, roadExp, _ := getShippingRates(product.Country, direct)
	fmt.Printf("Road only standard fee: %.2f USD\n", roadStd)
	fmt.Printf("Road only express fee: %.2f USD\n", roadExp)

	hasDomestic := true
	var dAir float64
	if strings.EqualFold(origA.ID, destA.ID) {
		dAir = 0
		fmt.Printf("Domestic Flight Fee (%s-%s): %.2f USD\n", origA.ID, destA.ID, dAir)
	} else {
		df, err := getDomesticFlightFee(origA.ID, destA.ID)
		if err != nil {
			hasDomestic = false
			fmt.Printf("Domestic flight cost not found for %s -> %s\n", origA.ID, destA.ID)
		} else {
			dAir = df
			fmt.Printf("Domestic Flight Fee (%s-%s): %.2f USD\n", origA.ID, destA.ID, round2(dAir))
		}
	}

	origStd, origExp, _ := getShippingRates(product.Country, dOrigA)
	destStd, destExp, _ := getShippingRates(user.Country, dDestA)

	var airStd, airExp float64
	if hasDomestic {
		airStd = round2(origStd + dAir + destStd)
		airExp = round2(origExp + dAir + destExp)
		fmt.Printf("Air route standard fee: %.2f USD\n", airStd)
		fmt.Printf("Air route express fee: %.2f USD\n", airExp)
	} else {
		airStd = math.Inf(1)
		airExp = math.Inf(1)
		fmt.Println("Air route standard fee: n/a")
		fmt.Println("Air route express fee: n/a")
	}

	finalStd := math.Min(roadStd, airStd)
	finalExp := math.Min(roadExp, airExp)

	resp := ShippingDomesticResponse{
		StandardFee: round2(finalStd),
		ExpressFee:  round2(finalExp),
	}
	writeJSON(w, http.StatusOK, resp)
}

func handleInternational(w http.ResponseWriter, product *Product, user *UserGeo) {
	fmt.Println("Cross-border delivery")

	direct := distanceKM(product.Latitude, product.Longitude, user.Latitude, user.Longitude)
	fmt.Printf("Direct distance: %.2f km\n", round2(direct))

	// Sea leg
	origPort, dOrigP, _ := getClosestPort(product.Country, product.Latitude, product.Longitude)
	destPort, dDestP, _ := getClosestPort(user.Country, user.Latitude, user.Longitude)
	fmt.Printf("Origin nearest port: %s (%.2f km)\n", origPort.ID, round2(dOrigP))
	fmt.Printf("Destination nearest port: %s (%.2f km)\n", destPort.ID, round2(dDestP))

	seaCost, seaErr := getSeaFreightFee(product.Country, user.Country)
	if seaErr != nil {
		fmt.Printf("Sea freight cost not found for %s -> %s\n", strings.ToUpper(product.Country), strings.ToUpper(user.Country))
	}
	if seaErr == nil {
		fmt.Printf("Sea Freight Fee (%s->%s): %.2f USD\n", strings.ToUpper(product.Country), strings.ToUpper(user.Country), round2(seaCost))
	}
	origPortStd, origPortExp, _ := getShippingRates(product.Country, dOrigP)
	destPortStd, destPortExp, _ := getShippingRates(user.Country, dDestP)

	seaStd := math.Inf(1)
	seaExp := math.Inf(1)
	if seaErr == nil {
		seaStd = round2(origPortStd + seaCost + destPortStd)
		seaExp = round2(origPortExp + seaCost + destPortExp)
		fmt.Printf("Sea route standard fee: %.2f USD\n", seaStd)
		fmt.Printf("Sea route express fee: %.2f USD\n", seaExp)
	} else {
		fmt.Println("Sea route standard fee: n/a")
		fmt.Println("Sea route express fee: n/a")
	}

	// Air leg
	origA, dOrigA, _ := getClosestAirport(product.Country, product.Latitude, product.Longitude)
	destA, dDestA, _ := getClosestAirport(user.Country, user.Latitude, user.Longitude)
	fmt.Printf("Origin nearest airport: %s (%.2f km)\n", origA.ID, round2(dOrigA))
	fmt.Printf("Destination nearest airport: %s (%.2f km)\n", destA.ID, round2(dDestA))

	airCost, airErr := getInternationalAirFee(origA.ID, destA.ID)
	if airErr != nil {
		fmt.Printf("International air cost not found for %s -> %s\n", origA.ID, destA.ID)
	} else {
		fmt.Printf("International Air Fee (%s-%s): %.2f USD\n", origA.ID, destA.ID, round2(airCost))
	}
	origAirStd, origAirExp, _ := getShippingRates(product.Country, dOrigA)
	destAirStd, destAirExp, _ := getShippingRates(user.Country, dDestA)

	airStd := math.Inf(1)
	airExp := math.Inf(1)
	if airErr == nil {
		airStd = round2(origAirStd + airCost + destAirStd)
		airExp = round2(origAirExp + airCost + destAirExp)
		fmt.Printf("Air route standard fee: %.2f USD\n", airStd)
		fmt.Printf("Air route express fee: %.2f USD\n", airExp)
	} else {
		fmt.Println("Air route standard fee: n/a")
		fmt.Println("Air route express fee: n/a")
	}

	resp := ShippingInternationalResponse{}
	if !math.IsInf(airStd, 1) {
		resp.AirStandardFee = airStd
	}
	if !math.IsInf(airExp, 1) {
		resp.AirExpressFee = airExp
	}
	if !math.IsInf(seaStd, 1) {
		resp.SeaStandardFee = seaStd
	}
	if !math.IsInf(seaExp, 1) {
		resp.SeaExpressFee = seaExp
	}
	if resp.AirStandardFee == 0 && resp.AirExpressFee == 0 && resp.SeaStandardFee == 0 && resp.SeaExpressFee == 0 {
		resp.Message = "No international route available (sea/air cost missing)"
	}
	writeJSON(w, http.StatusOK, resp)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(true)
	_ = enc.Encode(v)
}

func main() {
	loadConfig("config.json")
	initDBWait()

	http.HandleFunc("/profile", geocodeHandler)
	http.HandleFunc("/shipping", shippingHandler)

	fmt.Println("Server started at :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

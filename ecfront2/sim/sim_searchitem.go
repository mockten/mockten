package main

import (
    "encoding/json"
    "net/http"
    "strings"
)

type Product struct {
    ID        string `json:"id"`
    Name      string `json:"name"`
    ImageURL  string `json:"imageUrl"`
    Favorite  bool   `json:"favorite"`
    Category  string `json:"category"`
}

var products = []Product{
    {ID: "550e8400-e29b-41d4-a716-446655440000", Name: "Sample Item 1", ImageURL: "/images/img1.jpg", Favorite: true, Category: "四谷物産 課長"},
    {ID: "550e8400-e29b-41d4-a716-446655440001", Name: "Sample Item 2", ImageURL: "/images/img2.jpg", Favorite: false, Category: "Yahoo! Japan 第四営業部部長"},
    {ID: "550e8400-e29b-41d4-a716-446655440002", Name: "Sample Item 3", ImageURL: "/images/img3.jpg", Favorite: false, Category: "Splunk Service合同会社 CustomerSuccessManager"},
    {ID: "550e8400-e29b-41d4-a716-446655440003", Name: "Sample Item 4", ImageURL: "/images/img4.jpg", Favorite: false, Category: "東京大学 学生"},
    {ID: "550e8400-e29b-41d4-a716-446655440004", Name: "Sample Item 5", ImageURL: "/images/img5.jpg", Favorite: false, Category: "NEC Corporation SI営業部 主任"},
    {ID: "550e8400-e29b-41d4-a716-446655440005", Name: "Sample Item 6", ImageURL: "/images/img6.jpg", Favorite: false, Category: "material-Design 主任"},
    {ID: "550e8400-e29b-41d4-a716-446655440006", Name: "Sample Item 7", ImageURL: "/images/img1.jpg", Favorite: false, Category: "Splunk Service合同会社 TechnicalSuccess"},
    {ID: "550e8400-e29b-41d4-a716-446655440007", Name: "Sample Item 8", ImageURL: "/images/img1.jpg", Favorite: false, Category: "Splunk Service合同会社 TechnicalSuccess"},
    {ID: "550e8400-e29b-41d4-a716-446655440008", Name: "Sample Item 9", ImageURL: "/images/img1.jpg", Favorite: false, Category: "Splunk Service合同会社 TechnicalSuccess"},
    {ID: "550e8400-e29b-41d4-a716-446655440009", Name: "Sample Item 10", ImageURL: "/images/img1.jpg", Favorite: false, Category: "Splunk Service合同会社 TechnicalSuccess"},
}

func searchHandler(w http.ResponseWriter, r *http.Request) {
    query := r.URL.Query().Get("productname")
    var filteredProducts []Product

    if query != "" {
        for _, product := range products {
            if strings.Contains(strings.ToLower(product.Name), strings.ToLower(query)) {
                filteredProducts = append(filteredProducts, product)
            }
        }
    } else {
        filteredProducts = products
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(filteredProducts)
}

func main() {
    http.HandleFunc("/search", searchHandler)
    http.ListenAndServe(":8080", nil)
}


package main

import (
	"testing"
	"time"
)

func TestConvertToResponse(t *testing.T) {
	now := time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	last := now.Add(24 * time.Hour)
	detail := &ProductDetail{
		ProductID:    "p-1",
		ProductName:  "MacBook",
		Price:        1999,
		CategoryID:   "10",
		CategoryName: "Laptops",
		Summary:      "A laptop",
		RegistDay:    now,
		LastUpdate:   last,
		SellerName:   "Acme",
		Stocks:       7,
		AvgReview:    4.5,
		ReviewCount:  12,
	}

	got := ConvertToResponse(detail)

	if got.ProductID != detail.ProductID ||
		got.ProductName != detail.ProductName ||
		got.Price != detail.Price ||
		got.CategoryID != detail.CategoryID ||
		got.CategoryName != detail.CategoryName ||
		got.Summary != detail.Summary ||
		!got.RegistDay.Equal(detail.RegistDay) ||
		!got.LastUpdate.Equal(detail.LastUpdate) ||
		got.SellerName != detail.SellerName ||
		got.Stocks != detail.Stocks ||
		got.AvgReview != detail.AvgReview ||
		got.ReviewCount != detail.ReviewCount {
		t.Errorf("ConvertToResponse did not faithfully copy fields:\n got  %+v\n want %+v", got, detail)
	}
}

package service

import (
	"context"

	"github.com/mockten/mockten/cart/internal/model"
	"go.uber.org/zap"
)

type CartGetter interface {
	Get(ctx context.Context, userID string) (*model.RedisCart, error)
}

type ProductRepo interface {
	GetByIDs(ctx context.Context, productIDs []string) ([]model.Product, error)
}

// For display: combine Redis(cart) + MySQL(product) and return
type CartService struct {
	cartStore   CartGetter
	productRepo ProductRepo
}

func NewCartService(cs CartGetter, pr ProductRepo) *CartService {
	return &CartService{cartStore: cs, productRepo: pr}
}

func (s *CartService) GetCartView(ctx context.Context, userID string) (*model.CartView, error) {
	c, err := s.cartStore.Get(ctx, userID)
	if err != nil {
		return nil, err
	}

	// extract product_id (remove duplicates)
	seen := make(map[string]struct{}, len(c.Cart))
	ids := make([]string, 0, len(c.Cart))
	for _, it := range c.Cart {
		if it.ProductID == "" {
			continue
		}
		if _, ok := seen[it.ProductID]; ok {
			continue
		}
		seen[it.ProductID] = struct{}{}
		ids = append(ids, it.ProductID)
	}

	products, err := s.productRepo.GetByIDs(ctx, ids)
	zap.L().Debug("CartService.GetCartView.products",
		zap.Any("products", products),
		zap.Error(err),
	)
	if err != nil {
		return nil, err
	}

	pm := make(map[string]model.Product, len(products))
	for _, p := range products {
		pm[p.ProductID] = p
	}
	zap.L().Debug("CartService.GetCartView.pm",
		zap.Any("pm", pm),
	)

	// keep cart order and combine (image_url is not returned)
	items := make([]model.CartViewItem, 0, len(c.Cart))
	for _, it := range c.Cart {
		p, ok := pm[it.ProductID]
		if !ok {
			// skip if the product is deleted/unpublished in the DB (sufficient for learning purposes)
			continue
		}
		dto := model.ProductDTO{
			ProductID:        p.ProductID,
			ProductName:      p.ProductName,
			SellerID:         p.SellerID,
			Price:            p.Price,
			CategoryID:       p.CategoryID,
			Summary:          p.Summary,
			ProductCondition: p.ProductCondition,
			GeoID:            p.GeoID,
			RegistDay:        p.RegistDay,
			LastUpdate:       p.LastUpdate,
		}
		items = append(items, model.CartViewItem{
			ID:           it.ID,
			Product:      dto,
			Quantity:     it.Quantity,
			AddedAt:      it.AddedAt,
			ShippingFee:  it.ShippingFee,
			ShippingType: it.ShippingType,
			ShippingDays: it.ShippingDays,
		})
	}
	zap.L().Debug("CartService.GetCartView.items",
		zap.Any("items", items),
	)
	return &model.CartView{
		UpdatedAt: c.UpdatedAt,
		Items:     items,
	}, nil
}

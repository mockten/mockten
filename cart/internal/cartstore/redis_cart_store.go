package cartstore

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/mockten/mockten/cart/internal/model"
	"go.uber.org/zap"
)

var ErrCartNotFound = errors.New("cart not found")

type RedisCartStore struct {
	rdb        *redis.Client
	ttl        time.Duration
	maxRetries int
}

func NewRedisCartStore(rdb *redis.Client, ttl time.Duration) *RedisCartStore {
	return &RedisCartStore{
		rdb:        rdb,
		ttl:        ttl,
		maxRetries: 10,
	}
}

func (s *RedisCartStore) key(userID string) string {
	return fmt.Sprintf("cart:%s", userID)
}

func (s *RedisCartStore) Get(ctx context.Context, userID string) (*model.RedisCart, error) {
	val, err := s.rdb.Get(ctx, s.key(userID)).Result()
	zap.L().Debug("RedisCartStore.Get",
		zap.String("userID", userID),
		zap.String("val", val),
		zap.Error(err),
	)
	if err == redis.Nil {
		return nil, ErrCartNotFound
	}
	if err != nil {
		return nil, err
	}

	var c model.RedisCart
	if err := json.Unmarshal([]byte(val), &c); err != nil {
		return nil, err
	}
	return &c, nil
}

// WATCH + Optimistic Lock (CAS) to safely update the cart
func (s *RedisCartStore) updateCart(ctx context.Context, userID string, mutate func(c *model.RedisCart) error) (*model.RedisCart, error) {
	key := s.key(userID)

	var lastErr error
	for i := 0; i < s.maxRetries; i++ {
		var updated *model.RedisCart

		err := s.rdb.Watch(ctx, func(tx *redis.Tx) error {
			val, err := tx.Get(ctx, key).Result()
			zap.L().Debug("RedisCartStore.updateCart",
				zap.String("userID", userID),
				zap.String("val", val),
				zap.Error(err),
			)
			var cart model.RedisCart
			switch {
			case err == redis.Nil:
				cart = model.RedisCart{
					UpdatedAt: time.Now().UTC(),
					Cart:      []model.RedisCartItem{},
				}
			case err != nil:
				return err
			default:
				if err := json.Unmarshal([]byte(val), &cart); err != nil {
					return err
				}
			}

			if err := mutate(&cart); err != nil {
				return err
			}
			cart.UpdatedAt = time.Now().UTC()

			b, err := json.Marshal(&cart)
			if err != nil {
				return err
			}

			_, err = tx.TxPipelined(ctx, func(p redis.Pipeliner) error {
				if s.ttl > 0 {
					p.Set(ctx, key, b, s.ttl)
				} else {
					p.Set(ctx, key, b, 0)
				}
				return nil
			})
			if err != nil {
				return err
			}

			updated = &cart
			return nil
		}, key)

		if err == nil {
			return updated, nil
		}
		if errors.Is(err, redis.TxFailedErr) {
			lastErr = err
			continue // 競合 → retry
		}
		return nil, err
	}

	return nil, fmt.Errorf("cart update conflict after retries: %w", lastErr)
}

func findItemIndex(items []model.RedisCartItem, productID string) int {
	for i := range items {
		if items[i].ProductID == productID {
			return i
		}
	}
	return -1
}

func (s *RedisCartStore) AddItem(ctx context.Context, userID, productID string, addQty int) (*model.RedisCart, error) {
	now := time.Now().UTC()
	return s.updateCart(ctx, userID, func(c *model.RedisCart) error {
		idx := findItemIndex(c.Cart, productID)
		if idx >= 0 {
			c.Cart[idx].Quantity += addQty
			if c.Cart[idx].Quantity <= 0 {
				c.Cart = append(c.Cart[:idx], c.Cart[idx+1:]...)
			}
			return nil
		}
		c.Cart = append(c.Cart, model.RedisCartItem{
			ProductID: productID,
			Quantity:  addQty,
			AddedAt:   now,
		})
		return nil
	})
}

func (s *RedisCartStore) SetItemQty(ctx context.Context, userID, productID string, qty int) (*model.RedisCart, error) {
	now := time.Now().UTC()
	return s.updateCart(ctx, userID, func(c *model.RedisCart) error {
		idx := findItemIndex(c.Cart, productID)

		if qty <= 0 {
			if idx >= 0 {
				c.Cart = append(c.Cart[:idx], c.Cart[idx+1:]...)
			}
			return nil
		}

		if idx >= 0 {
			c.Cart[idx].Quantity = qty
			return nil
		}

		c.Cart = append(c.Cart, model.RedisCartItem{
			ProductID: productID,
			Quantity:  qty,
			AddedAt:   now,
		})
		return nil
	})
}

func (s *RedisCartStore) RemoveItem(ctx context.Context, userID, productID string) (*model.RedisCart, error) {
	return s.updateCart(ctx, userID, func(c *model.RedisCart) error {
		idx := findItemIndex(c.Cart, productID)
		if idx >= 0 {
			c.Cart = append(c.Cart[:idx], c.Cart[idx+1:]...)
		}
		return nil
	})
}

func (s *RedisCartStore) ClearCart(ctx context.Context, userID string) (*model.RedisCart, error) {
	return s.updateCart(ctx, userID, func(c *model.RedisCart) error {
		c.Cart = []model.RedisCartItem{}
		return nil
	})
}

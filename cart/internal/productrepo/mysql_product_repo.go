package productrepo

import (
	"context"

	"github.com/jmoiron/sqlx"

	"github.com/mockten/mockten/cart/internal/model"
	"go.uber.org/zap"
)

type MySQLProductRepo struct {
	db *sqlx.DB
}

func NewMySQLProductRepo(db *sqlx.DB) *MySQLProductRepo {
	return &MySQLProductRepo{db: db}
}

func (r *MySQLProductRepo) GetByIDs(ctx context.Context, productIDs []string) ([]model.Product, error) {
	if len(productIDs) == 0 {
		return []model.Product{}, nil
	}

	query, args, err := sqlx.In(`
		SELECT
		  p.product_id, p.product_name, p.seller_id, p.price, p.category_id, p.summary,
		  p.product_condition, p.geo_id, p.regist_day, p.last_update, COALESCE(s.stocks, 0) as stocks
		FROM Product p
		LEFT JOIN Stock s ON p.product_id = s.product_id
		WHERE p.product_id IN (?)
	`, productIDs)
	if err != nil {
		zap.L().Debug("sqlx.In",
			zap.Error(err),
		)
		return nil, err
	}

	query = r.db.Rebind(query)

	var ps []model.Product
	if err := r.db.SelectContext(ctx, &ps, query, args...); err != nil {
		zap.L().Debug("r.db.SelectContext",
			zap.Error(err),
		)
		return nil, err
	}
	zap.L().Debug("ProductRepo.GetByIDs",
		zap.Any("products", ps),
	)
	return ps, nil
}

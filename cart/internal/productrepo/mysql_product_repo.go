package productrepo

import (
	"context"

	"github.com/jmoiron/sqlx"

	"github.com/mockten/mockten/cart/internal/model"
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
		  product_id, product_name, seller_id, price, category_id, summary,
		  product_condition, geo_id, regist_day, last_update
		FROM product
		WHERE product_id IN (?)
	`, productIDs)
	if err != nil {
		return nil, err
	}

	query = r.db.Rebind(query)

	var ps []model.Product
	if err := r.db.SelectContext(ctx, &ps, query, args...); err != nil {
		return nil, err
	}
	return ps, nil
}

package products

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

const skuConstraint = "products_sku_key"

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) List(ctx context.Context, search *string) ([]Product, error) {
	rows, err := sqlc.New(r.pool).ListProductsWithStock(ctx, search)
	if err != nil {
		return nil, fmt.Errorf("query products: %w", err)
	}
	items := make([]Product, 0, len(rows))
	for _, row := range rows {
		items = append(items, Product{
			ID: row.ID, SKU: row.Sku, Name: row.Name, Price: row.Price,
			LowStockThreshold: row.LowStockThreshold, IsActive: row.IsActive,
			OnHand: row.OnHand, Reserved: row.Reserved,
			CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
		})
	}
	return items, nil
}

func (r *PgRepository) Get(ctx context.Context, id int64) (Product, error) {
	row, err := sqlc.New(r.pool).GetProductWithStock(ctx, id)
	if database.IsNotFound(err) {
		return Product{}, ErrNotFound
	}
	if err != nil {
		return Product{}, fmt.Errorf("query product: %w", err)
	}
	return Product{
		ID: row.ID, SKU: row.Sku, Name: row.Name, Price: row.Price,
		LowStockThreshold: row.LowStockThreshold, IsActive: row.IsActive,
		OnHand: row.OnHand, Reserved: row.Reserved,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}, nil
}

func (r *PgRepository) Holds(ctx context.Context, id int64) ([]Hold, error) {
	rows, err := sqlc.New(r.pool).ListProductHolds(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("query holds: %w", err)
	}
	holds := make([]Hold, 0, len(rows))
	for _, row := range rows {
		holds = append(holds, Hold{
			OrderID: row.OrderID, OrderNo: row.OrderNo, Channel: row.Channel,
			Status: row.Status, Qty: row.Qty, CreatedAt: row.CreatedAt,
		})
	}
	return holds, nil
}

func (r *PgRepository) Create(ctx context.Context, in Input) (int64, error) {
	var id int64
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		var err error
		id, err = q.CreateProduct(ctx, sqlc.CreateProductParams{
			Sku: in.SKU, Name: in.Name, Price: in.Price,
			LowStockThreshold: in.LowStockThreshold, IsActive: in.IsActive,
		})
		if database.IsUniqueViolation(err, skuConstraint) {
			return ErrSKUTaken
		}
		if err != nil {
			return fmt.Errorf("insert product: %w", err)
		}
		if err := q.CreateStockBalance(ctx, id); err != nil {
			return fmt.Errorf("insert stock balance: %w", err)
		}
		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionProductCreate,
			EntityType: audit.EntityProduct,
			EntityID:   &id,
			Detail:     map[string]any{"sku": in.SKU, "name": in.Name, "price": in.Price},
		})
	})
	return id, err
}

func (r *PgRepository) Update(ctx context.Context, id int64, in Input, changed []string) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		_, err := q.UpdateProduct(ctx, sqlc.UpdateProductParams{
			ID: id, Sku: in.SKU, Name: in.Name, Price: in.Price,
			LowStockThreshold: in.LowStockThreshold, IsActive: in.IsActive,
		})
		switch {
		case database.IsNotFound(err):
			return ErrNotFound
		case database.IsUniqueViolation(err, skuConstraint):
			return ErrSKUTaken
		case err != nil:
			return fmt.Errorf("update product: %w", err)
		}
		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionProductUpdate,
			EntityType: audit.EntityProduct,
			EntityID:   &id,
			Detail: map[string]any{
				"changed": changed, "sku": in.SKU, "name": in.Name, "price": in.Price,
				"low_stock_threshold": in.LowStockThreshold, "is_active": in.IsActive,
			},
		})
	})
}

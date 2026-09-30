package stock

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) Apply(ctx context.Context, c Change, check Check, entry audit.Entry) (Balance, error) {
	var after Balance
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		locked, err := Lock(ctx, q, []int64{c.ProductID})
		if err != nil {
			return err
		}
		row, ok := locked[c.ProductID]
		if !ok {
			return ErrProductNotFound
		}
		if check != nil {
			if err := check(row.Balance); err != nil {
				return err
			}
		}

		after, err = Apply(ctx, q, c)
		if err != nil {
			return err
		}

		entry.Detail["on_hand_after"] = after.OnHand
		entry.Detail["available_after"] = after.Available()
		return audit.Write(ctx, q, entry)
	})
	return after, err
}

func (r *PgRepository) Reverse(ctx context.Context, id int64, plan ReversalPlanner, entry audit.Entry) (Balance, error) {
	var after Balance
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		m, err := q.GetMovement(ctx, id)
		if database.IsNotFound(err) {
			return ErrMovementNotFound
		}
		if err != nil {
			return fmt.Errorf("get movement: %w", err)
		}

		change, err := plan(MovementInfo{
			ID: m.ID, ProductID: m.ProductID, Type: MovementType(m.Type), QtyChange: m.QtyChange,
			RefType: m.RefType, ReversesID: m.ReversesID, Reversed: m.Reversed, CreatedAt: m.CreatedAt,
		})
		if err != nil {
			return err
		}

		locked, err := Lock(ctx, q, []int64{change.ProductID})
		if err != nil {
			return err
		}
		if err := checkRemovable(change.QtyChange)(locked[change.ProductID].Balance); err != nil {
			return err
		}

		after, err = Apply(ctx, q, change)
		if err != nil {
			return err
		}

		entry.EntityID = &change.ProductID
		entry.Detail["qty_change"] = change.QtyChange
		entry.Detail["available_after"] = after.Available()
		return audit.Write(ctx, q, entry)
	})
	return after, err
}

func (r *PgRepository) ListMovements(ctx context.Context, f MovementFilter) ([]Movement, int64, error) {
	var typ *string
	if f.Type != nil {
		typ = ptr(string(*f.Type))
	}

	q := sqlc.New(r.pool)
	rows, err := q.ListMovements(ctx, sqlc.ListMovementsParams{
		ProductID: f.ProductID, Type: typ, PageLimit: f.Limit, PageOffset: f.Offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("query movements: %w", err)
	}
	total, err := q.CountMovements(ctx, sqlc.CountMovementsParams{ProductID: f.ProductID, Type: typ})
	if err != nil {
		return nil, 0, fmt.Errorf("count movements: %w", err)
	}

	items := make([]Movement, 0, len(rows))
	for _, m := range rows {
		items = append(items, Movement{
			ID:             m.ID,
			ProductID:      m.ProductID,
			SKU:            m.Sku,
			ProductName:    m.ProductName,
			Type:           MovementType(m.Type),
			QtyChange:      m.QtyChange,
			ReservedChange: m.ReservedChange,
			OnHandAfter:    m.OnHandAfter,
			ReservedAfter:  m.ReservedAfter,
			RefType:        m.RefType,
			RefID:          m.RefID,
			OrderNo:        m.OrderNo,
			OrderChannel:   m.OrderChannel,
			Reason:         m.Reason,
			Note:           m.Note,
			CreatedByName:  m.CreatedByName,
			CreatedAt:      m.CreatedAt,
			ReversesID:     m.ReversesID,
			Reversed:       m.Reversed,
		})
	}
	return items, total, nil
}

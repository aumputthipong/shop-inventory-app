package stock

import (
	"context"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
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

func (r *PgRepository) Receive(ctx context.Context, in NewReceipt, entry audit.Entry) (Receipt, error) {
	ids := make([]int64, 0, len(in.Lines))
	for _, l := range in.Lines {
		ids = append(ids, l.ProductID)
	}
	slices.Sort(ids)

	var out Receipt
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		created, err := q.CreateReceipt(ctx, sqlc.CreateReceiptParams{
			Reference: optional(in.Reference), Note: optional(in.Note), CreatedBy: actor.IDFrom(ctx),
		})
		if err != nil {
			return fmt.Errorf("insert receipt: %w", err)
		}
		out = Receipt{ID: created.ID, Reference: optional(in.Reference), Note: optional(in.Note), CreatedAt: created.CreatedAt}

		locked, err := Lock(ctx, q, ids)
		if err != nil {
			return err
		}
		refType := RefReceipt
		for _, l := range in.Lines {
			row, ok := locked[l.ProductID]
			if !ok {
				return fmt.Errorf("%w: %d", ErrProductNotFound, l.ProductID)
			}
			after, err := Apply(ctx, q, Change{
				ProductID: l.ProductID, Type: TypeStockIn, QtyChange: l.Qty, RefType: &refType, RefID: &created.ID,
			})
			if err != nil {
				return err
			}
			after.ProductID = l.ProductID
			out.Lines = append(out.Lines, ReceivedLine{
				ProductID: l.ProductID, SKU: row.SKU, Name: row.Name, Qty: l.Qty, Balance: after,
			})
		}

		entry.EntityID = &created.ID
		return audit.Write(ctx, q, entry)
	})
	return out, err
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
			ID:               m.ID,
			ProductID:        m.ProductID,
			SKU:              m.Sku,
			ProductName:      m.ProductName,
			Type:             MovementType(m.Type),
			QtyChange:        m.QtyChange,
			ReservedChange:   m.ReservedChange,
			OnHandAfter:      m.OnHandAfter,
			ReservedAfter:    m.ReservedAfter,
			RefType:          m.RefType,
			RefID:            m.RefID,
			OrderNo:          m.OrderNo,
			OrderChannel:     m.OrderChannel,
			Reason:           m.Reason,
			Note:             m.Note,
			CreatedByName:    m.CreatedByName,
			CreatedAt:        m.CreatedAt,
			ReversesID:       m.ReversesID,
			Reversed:         m.Reversed,
			ReceiptReference: m.ReceiptReference,
		})
	}
	return items, total, nil
}

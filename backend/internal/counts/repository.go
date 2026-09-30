package counts

import (
	"context"
	"fmt"
	"slices"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) Create(ctx context.Context, in NewCount, plan ApprovalPlanner) (int64, error) {
	var id int64
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		var err error
		id, err = q.CreateCount(ctx, sqlc.CreateCountParams{Note: optional(in.Note), CreatedBy: actor.IDFrom(ctx)})
		if err != nil {
			return fmt.Errorf("insert stock count: %w", err)
		}

		for _, l := range in.Lines {
			n, err := q.InsertCountLine(ctx, sqlc.InsertCountLineParams{
				CountID: id, ProductID: l.ProductID, Counted: l.Counted,
			})
			if err != nil {
				return fmt.Errorf("insert count line: %w", err)
			}
			if n == 0 {
				return fmt.Errorf("%w: product %d", ErrUnknownProduct, l.ProductID)
			}
		}

		err = audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionCountSubmit,
			EntityType: audit.EntityStockCount,
			EntityID:   &id,
			Detail:     map[string]any{"lines": len(in.Lines)},
		})
		if err != nil {
			return err
		}

		if in.Approve {
			return approve(ctx, q, id, plan)
		}
		return nil
	})
	return id, err
}

func (r *PgRepository) Decide(ctx context.Context, id int64, to Status, plan ApprovalPlanner) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		current, err := q.LockCount(ctx, id)
		if database.IsNotFound(err) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("lock stock count: %w", err)
		}
		if Status(current.Status) != StatusSubmitted {
			return &StateError{Status: Status(current.Status)}
		}

		if to == StatusApproved {
			return approve(ctx, q, id, plan)
		}
		if err := setStatus(ctx, q, id, StatusRejected); err != nil {
			return err
		}
		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionCountReject,
			EntityType: audit.EntityStockCount,
			EntityID:   &id,
			Detail:     map[string]any{},
		})
	})
}

func approve(ctx context.Context, q *sqlc.Queries, id int64, plan ApprovalPlanner) error {
	rows, err := q.ListCountLines(ctx, id)
	if err != nil {
		return fmt.Errorf("list count lines: %w", err)
	}

	lines := make([]Line, 0, len(rows))
	var ids []int64
	for _, row := range rows {
		l := toLine(row)
		lines = append(lines, l)
		if l.Variance() != 0 {
			ids = append(ids, l.ProductID)
		}
	}
	slices.Sort(ids)

	locked, err := stock.Lock(ctx, q, ids)
	if err != nil {
		return err
	}
	changes, err := plan(id, lines, locked)
	if err != nil {
		return err
	}

	adjusted := make([]map[string]any, 0, len(changes))
	for _, c := range changes {
		if _, err := stock.Apply(ctx, q, c); err != nil {
			return err
		}
		adjusted = append(adjusted, map[string]any{"product_id": c.ProductID, "qty_change": c.QtyChange})
	}

	if err := setStatus(ctx, q, id, StatusApproved); err != nil {
		return err
	}
	return audit.Write(ctx, q, audit.Entry{
		Action:     audit.ActionCountApprove,
		EntityType: audit.EntityStockCount,
		EntityID:   &id,
		Detail:     map[string]any{"adjusted": adjusted},
	})
}

func setStatus(ctx context.Context, q *sqlc.Queries, id int64, to Status) error {
	err := q.DecideCount(ctx, sqlc.DecideCountParams{ID: id, Status: string(to), DecidedBy: actor.IDFrom(ctx)})
	if err != nil {
		return fmt.Errorf("set stock count status: %w", err)
	}
	return nil
}

func (r *PgRepository) Get(ctx context.Context, id int64) (Count, error) {
	q := sqlc.New(r.pool)
	row, err := q.GetCount(ctx, id)
	if database.IsNotFound(err) {
		return Count{}, ErrNotFound
	}
	if err != nil {
		return Count{}, fmt.Errorf("query stock count: %w", err)
	}
	rows, err := q.ListCountLines(ctx, id)
	if err != nil {
		return Count{}, fmt.Errorf("query count lines: %w", err)
	}

	lines := make([]Line, 0, len(rows))
	for _, l := range rows {
		lines = append(lines, toLine(l))
	}
	return Count{
		ID:            row.ID,
		Status:        Status(row.Status),
		Note:          row.Note,
		CreatedByName: row.CreatedByName,
		DecidedByName: row.DecidedByName,
		CreatedAt:     row.CreatedAt,
		DecidedAt:     row.DecidedAt,
		Lines:         lines,
	}, nil
}

func (r *PgRepository) List(ctx context.Context, limit, offset int32) ([]Summary, int64, error) {
	q := sqlc.New(r.pool)
	rows, err := q.ListCounts(ctx, sqlc.ListCountsParams{PageLimit: limit, PageOffset: offset})
	if err != nil {
		return nil, 0, fmt.Errorf("query stock counts: %w", err)
	}
	total, err := q.CountCounts(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("count stock counts: %w", err)
	}

	items := make([]Summary, 0, len(rows))
	for _, c := range rows {
		items = append(items, Summary{
			ID:            c.ID,
			Status:        Status(c.Status),
			Note:          c.Note,
			CreatedByName: c.CreatedByName,
			CreatedAt:     c.CreatedAt,
			DecidedAt:     c.DecidedAt,
			LineCount:     c.LineCount,
			DiffCount:     c.DiffCount,
		})
	}
	return items, total, nil
}

func toLine(r sqlc.ListCountLinesRow) Line {
	return Line{
		ProductID: r.ProductID,
		SKU:       r.Sku,
		Name:      r.Name,
		Expected:  r.Expected,
		Counted:   r.Counted,
		OnHandNow: r.OnHandNow,
	}
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

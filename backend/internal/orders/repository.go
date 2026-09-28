package orders

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

const externalRefConstraint = "orders_channel_external_ref_key"

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) Create(ctx context.Context, in NewOrder, plan ReservationPlanner) (int64, error) {
	ids := make([]int64, 0, len(in.Items))
	for _, item := range in.Items {
		ids = append(ids, item.ProductID)
	}
	slices.Sort(ids)

	var orderID int64
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		locked, err := stock.Lock(ctx, q, ids)
		if err != nil {
			return err
		}
		lines, err := plan(locked)
		if err != nil {
			return err
		}

		created, err := q.CreateOrder(ctx, sqlc.CreateOrderParams{
			Channel:     string(in.Channel),
			ExternalRef: optional(in.ExternalRef),
			Note:        optional(in.Note),
			CreatedBy:   actor.IDFrom(ctx),
		})
		if database.IsUniqueViolation(err, externalRefConstraint) {
			return ErrExternalRefTaken
		}
		if err != nil {
			return fmt.Errorf("insert order: %w", err)
		}
		orderID = created.ID

		items := make([]map[string]any, 0, len(lines))
		for _, line := range lines {
			err := q.InsertOrderItem(ctx, sqlc.InsertOrderItemParams{
				OrderID: orderID, ProductID: line.ProductID, Qty: line.Qty, UnitPrice: line.UnitPrice,
			})
			if err != nil {
				return fmt.Errorf("insert order item: %w", err)
			}
			_, err = stock.Apply(ctx, q, stock.Change{
				ProductID:      line.ProductID,
				Type:           stock.TypeReserve,
				ReservedChange: line.Qty,
				RefType:        ptr(stock.RefOrder),
				RefID:          &orderID,
			})
			if err != nil {
				return err
			}
			items = append(items, map[string]any{"product_id": line.ProductID, "qty": line.Qty})
		}

		if err := q.RefreshOrderTotal(ctx, orderID); err != nil {
			return fmt.Errorf("refresh order total: %w", err)
		}

		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionOrderCreate,
			EntityType: audit.EntityOrder,
			EntityID:   &orderID,
			Detail:     map[string]any{"order_no": created.OrderNo, "channel": in.Channel, "items": items},
		})
	})
	return orderID, err
}

func (r *PgRepository) RecordRejection(ctx context.Context, in NewOrder, rejection *InsufficientStockError) error {
	shortages := make([]map[string]any, 0, len(rejection.Items))
	for _, s := range rejection.Items {
		shortages = append(shortages, map[string]any{
			"product_id": s.ProductID, "sku": s.SKU, "requested": s.Requested, "available": s.Available,
		})
	}
	return audit.Write(ctx, sqlc.New(r.pool), audit.Entry{
		Action:     audit.ActionOrderRejected,
		EntityType: audit.EntityOrder,
		Detail:     map[string]any{"channel": in.Channel, "external_ref": in.ExternalRef, "shortages": shortages},
	})
}

func (r *PgRepository) Transition(ctx context.Context, id int64, action Action, plan TransitionPlanner) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		current, err := q.LockOrder(ctx, id)
		if database.IsNotFound(err) {
			return ErrNotFound
		}
		if err != nil {
			return fmt.Errorf("lock order: %w", err)
		}

		t, err := plan(Status(current.Status))
		if err != nil {
			return err
		}

		if t.Effect != EffectNone {
			if err := applyEffect(ctx, q, id, t.Effect); err != nil {
				return err
			}
		}

		if err := q.SetOrderStatus(ctx, sqlc.SetOrderStatusParams{ID: id, Status: string(t.To)}); err != nil {
			return fmt.Errorf("set order status: %w", err)
		}

		return audit.Write(ctx, q, audit.Entry{
			Action:     auditAction(action),
			EntityType: audit.EntityOrder,
			EntityID:   &id,
			Detail:     map[string]any{"order_no": current.OrderNo, "from": current.Status, "to": t.To},
		})
	})
}

func applyEffect(ctx context.Context, q *sqlc.Queries, orderID int64, effect Effect) error {
	items, err := q.ListOrderItems(ctx, orderID)
	if err != nil {
		return fmt.Errorf("list order items: %w", err)
	}

	ids := make([]int64, 0, len(items))
	for _, item := range items {
		ids = append(ids, item.ProductID)
	}
	slices.Sort(ids)
	if _, err := stock.Lock(ctx, q, ids); err != nil {
		return err
	}

	for _, item := range items {
		change := stock.Change{
			ProductID:      item.ProductID,
			ReservedChange: -item.Qty,
			RefType:        ptr(stock.RefOrder),
			RefID:          &orderID,
		}
		if effect == EffectShip {
			change.Type = stock.TypeShip
			change.QtyChange = -item.Qty
		} else {
			change.Type = stock.TypeRelease
		}
		if _, err := stock.Apply(ctx, q, change); err != nil {
			return err
		}
	}
	return nil
}

func auditAction(a Action) string {
	switch a {
	case ActionPack:
		return audit.ActionOrderPack
	case ActionShip:
		return audit.ActionOrderShip
	default:
		return audit.ActionOrderCancel
	}
}

func (r *PgRepository) Get(ctx context.Context, id int64) (Order, error) {
	q := sqlc.New(r.pool)
	row, err := q.GetOrder(ctx, id)
	if database.IsNotFound(err) {
		return Order{}, ErrNotFound
	}
	if err != nil {
		return Order{}, fmt.Errorf("query order: %w", err)
	}
	rows, err := q.ListOrderItems(ctx, id)
	if err != nil {
		return Order{}, fmt.Errorf("query order items: %w", err)
	}

	items := make([]Item, 0, len(rows))
	for _, it := range rows {
		items = append(items, Item{ProductID: it.ProductID, SKU: it.Sku, Name: it.Name, Qty: it.Qty, UnitPrice: it.UnitPrice})
	}
	return Order{
		ID: row.ID, OrderNo: row.OrderNo, Channel: Channel(row.Channel), ExternalRef: row.ExternalRef,
		Status: Status(row.Status), Total: row.Total, Note: row.Note, CreatedByName: row.CreatedByName,
		CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
		PackedAt: row.PackedAt, ShippedAt: row.ShippedAt, CanceledAt: row.CanceledAt,
		Items: items,
	}, nil
}

func (r *PgRepository) List(ctx context.Context, f Filter) ([]Summary, int64, error) {
	var status *string
	if f.Status != nil {
		status = ptr(string(*f.Status))
	}
	q := sqlc.New(r.pool)
	rows, err := q.ListOrders(ctx, sqlc.ListOrdersParams{
		Status: status, Search: f.Search, PageLimit: f.Limit, PageOffset: f.Offset,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("query orders: %w", err)
	}
	total, err := q.CountOrders(ctx, sqlc.CountOrdersParams{Status: status, Search: f.Search})
	if err != nil {
		return nil, 0, fmt.Errorf("count orders: %w", err)
	}

	items := make([]Summary, 0, len(rows))
	for _, row := range rows {
		items = append(items, Summary{
			ID: row.ID, OrderNo: row.OrderNo, Channel: Channel(row.Channel), ExternalRef: row.ExternalRef,
			Status: Status(row.Status), Total: row.Total, ItemCount: row.ItemCount,
			CreatedByName: row.CreatedByName, CreatedAt: row.CreatedAt,
		})
	}
	return items, total, nil
}

func ptr[T any](v T) *T {
	return &v
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

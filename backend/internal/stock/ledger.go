// Package stock owns stock balances and the movement ledger that explains them.
package stock

import (
	"context"
	"errors"
	"fmt"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

type MovementType string

const (
	TypeStockIn MovementType = "STOCK_IN"
	TypeAdjust  MovementType = "ADJUST"
	TypeReserve MovementType = "RESERVE"
	TypeRelease MovementType = "RELEASE"
	TypeShip    MovementType = "SHIP"
	TypeReturn  MovementType = "RETURN"
)

func (t MovementType) Valid() bool {
	switch t {
	case TypeStockIn, TypeAdjust, TypeReserve, TypeRelease, TypeShip, TypeReturn:
		return true
	}
	return false
}

const RefOrder = "order"

var (
	ErrInsufficientStock = errors.New("not enough available stock")
	ErrProductNotFound   = errors.New("product not found")
)

type Balance struct {
	OnHand   int32
	Reserved int32
}

func (b Balance) Available() int32 {
	return b.OnHand - b.Reserved
}

type Change struct {
	ProductID      int64
	Type           MovementType
	QtyChange      int32
	ReservedChange int32
	RefType        *string
	RefID          *int64
	Reason         *string
	Note           *string
}

// Apply must run inside a transaction that already holds the balance row lock.
func Apply(ctx context.Context, q *sqlc.Queries, c Change) (Balance, error) {
	row, err := q.ApplyBalanceChange(ctx, sqlc.ApplyBalanceChangeParams{
		ProductID:      c.ProductID,
		QtyChange:      c.QtyChange,
		ReservedChange: c.ReservedChange,
	})
	switch {
	case database.IsNotFound(err):
		return Balance{}, ErrProductNotFound
	case database.IsCheckViolation(err, ""):
		return Balance{}, ErrInsufficientStock
	case err != nil:
		return Balance{}, fmt.Errorf("apply balance change: %w", err)
	}

	_, err = q.InsertMovement(ctx, sqlc.InsertMovementParams{
		ProductID:      c.ProductID,
		Type:           string(c.Type),
		QtyChange:      c.QtyChange,
		ReservedChange: c.ReservedChange,
		RefType:        c.RefType,
		RefID:          c.RefID,
		Reason:         c.Reason,
		Note:           c.Note,
		CreatedBy:      actor.IDFrom(ctx),
		OnHandAfter:    row.OnHand,
		ReservedAfter:  row.Reserved,
	})
	if err != nil {
		return Balance{}, fmt.Errorf("insert movement: %w", err)
	}

	return Balance{OnHand: row.OnHand, Reserved: row.Reserved}, nil
}

type LockedRow struct {
	ProductID int64
	SKU       string
	Name      string
	Price     string
	IsActive  bool
	Balance   Balance
}

// Lock takes row locks in product id order so concurrent callers cannot deadlock.
func Lock(ctx context.Context, q *sqlc.Queries, productIDs []int64) (map[int64]LockedRow, error) {
	rows, err := q.LockStockRows(ctx, productIDs)
	if err != nil {
		return nil, fmt.Errorf("lock stock rows: %w", err)
	}
	locked := make(map[int64]LockedRow, len(rows))
	for _, r := range rows {
		locked[r.ProductID] = LockedRow{
			ProductID: r.ProductID,
			SKU:       r.Sku,
			Name:      r.Name,
			Price:     r.Price,
			IsActive:  r.IsActive,
			Balance:   Balance{OnHand: r.OnHand, Reserved: r.Reserved},
		}
	}
	return locked, nil
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

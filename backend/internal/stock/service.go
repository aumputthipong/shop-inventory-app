package stock

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
)

const MaxQty = 100_000

type AdjustReason string

const (
	ReasonCountCorrection AdjustReason = "count_correction"
	ReasonDamaged         AdjustReason = "damaged"
	ReasonLost            AdjustReason = "lost"
	ReasonOther           AdjustReason = "other"
)

func (r AdjustReason) Valid() bool {
	switch r {
	case ReasonCountCorrection, ReasonDamaged, ReasonLost, ReasonOther:
		return true
	}
	return false
}

var (
	ErrInvalidQty    = errors.New("quantity out of range")
	ErrInvalidReason = errors.New("unknown adjust reason")
	ErrNoteRequired  = errors.New("a note is required when the reason is other")
)

// ShortageError reports how much could have been removed; it matches ErrInsufficientStock.
type ShortageError struct {
	Requested int32
	Available int32
	Reserved  int32
}

func (e *ShortageError) Error() string {
	return fmt.Sprintf("requested %d but only %d available", e.Requested, e.Available)
}

func (e *ShortageError) Is(target error) bool {
	return target == ErrInsufficientStock
}

type ReceiptInput struct {
	ProductID int64
	Qty       int32
	Note      string
}

type AdjustInput struct {
	ProductID int64
	QtyChange int32
	Reason    AdjustReason
	Note      string
}

type Movement struct {
	ID             int64
	ProductID      int64
	SKU            string
	ProductName    string
	Type           MovementType
	QtyChange      int32
	ReservedChange int32
	OnHandAfter    int32
	ReservedAfter  int32
	RefType        *string
	RefID          *int64
	OrderNo        *string
	OrderChannel   *string
	Reason         *string
	Note           *string
	CreatedByName  *string
	CreatedAt      time.Time
}

type MovementFilter struct {
	ProductID *int64
	Type      *MovementType
	Limit     int32
	Offset    int32
}

// Check runs after the balance row is locked and before the change is written.
type Check func(current Balance) error

type Repository interface {
	Apply(ctx context.Context, c Change, check Check, entry audit.Entry) (Balance, error)
	ListMovements(ctx context.Context, f MovementFilter) ([]Movement, int64, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) StockIn(ctx context.Context, in ReceiptInput) (Balance, error) {
	if in.Qty < 1 || in.Qty > MaxQty {
		return Balance{}, ErrInvalidQty
	}
	note := strings.TrimSpace(in.Note)

	change := Change{
		ProductID: in.ProductID,
		Type:      TypeStockIn,
		QtyChange: in.Qty,
		Note:      optional(note),
	}
	entry := audit.Entry{
		Action:     audit.ActionStockIn,
		EntityType: audit.EntityProduct,
		EntityID:   ptr(in.ProductID),
		Detail:     map[string]any{"qty": in.Qty, "note": note},
	}
	return s.apply(ctx, change, nil, entry)
}

func (s *Service) Adjust(ctx context.Context, in AdjustInput) (Balance, error) {
	if in.QtyChange == 0 || in.QtyChange > MaxQty || in.QtyChange < -MaxQty {
		return Balance{}, ErrInvalidQty
	}
	if !in.Reason.Valid() {
		return Balance{}, ErrInvalidReason
	}
	note := strings.TrimSpace(in.Note)
	if in.Reason == ReasonOther && note == "" {
		return Balance{}, ErrNoteRequired
	}

	change := Change{
		ProductID: in.ProductID,
		Type:      TypeAdjust,
		QtyChange: in.QtyChange,
		Reason:    ptr(string(in.Reason)),
		Note:      optional(note),
	}
	entry := audit.Entry{
		Action:     audit.ActionStockAdjust,
		EntityType: audit.EntityProduct,
		EntityID:   ptr(in.ProductID),
		Detail:     map[string]any{"qty_change": in.QtyChange, "reason": in.Reason, "note": note},
	}
	return s.apply(ctx, change, checkRemovable(in.QtyChange), entry)
}

// checkRemovable keeps an adjustment from taking units that orders already hold.
func checkRemovable(qtyChange int32) Check {
	return func(current Balance) error {
		if qtyChange >= 0 || current.Available() >= -qtyChange {
			return nil
		}
		return &ShortageError{Requested: -qtyChange, Available: current.Available(), Reserved: current.Reserved}
	}
}

func (s *Service) apply(ctx context.Context, c Change, check Check, entry audit.Entry) (Balance, error) {
	b, err := s.repo.Apply(ctx, c, check, entry)
	if err != nil {
		if errors.Is(err, ErrInsufficientStock) || errors.Is(err, ErrProductNotFound) {
			return Balance{}, err
		}
		return Balance{}, fmt.Errorf("apply %s: %w", c.Type, err)
	}
	return b, nil
}

func (s *Service) ListMovements(ctx context.Context, f MovementFilter) ([]Movement, int64, error) {
	if f.Type != nil && !f.Type.Valid() {
		return []Movement{}, 0, nil
	}
	items, total, err := s.repo.ListMovements(ctx, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list movements: %w", err)
	}
	return items, total, nil
}

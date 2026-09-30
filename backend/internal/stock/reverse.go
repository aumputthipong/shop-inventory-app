package stock

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
)

const (
	ReasonReversal = "reversal"
	ReversalWindow = 7 * 24 * time.Hour
)

var (
	ErrMovementNotFound = errors.New("movement not found")
	ErrNotReversible    = errors.New("only stock-in and adjustments can be reversed; cancel the order instead")
	ErrTooOld           = errors.New("movements older than 7 days cannot be reversed")
)

type MovementInfo struct {
	ID         int64
	ProductID  int64
	Type       MovementType
	QtyChange  int32
	RefType    *string
	ReversesID *int64
	Reversed   bool
	CreatedAt  time.Time
}

type ReversalPlanner func(m MovementInfo) (Change, error)

// PlanReversal undoes a mistyped stock-in (alone or on a receipt) or adjustment with an opposite ADJUST, keeping both rows in the ledger.
func PlanReversal(m MovementInfo, now time.Time) (Change, error) {
	switch {
	case m.Reversed:
		return Change{}, ErrAlreadyReversed
	case m.ReversesID != nil, m.RefType != nil && *m.RefType != RefReceipt, m.QtyChange == 0,
		m.Type != TypeStockIn && m.Type != TypeAdjust:
		return Change{}, ErrNotReversible
	case now.Sub(m.CreatedAt) > ReversalWindow:
		return Change{}, ErrTooOld
	}
	return Change{
		ProductID:  m.ProductID,
		Type:       TypeAdjust,
		QtyChange:  -m.QtyChange,
		Reason:     ptr(ReasonReversal),
		ReversesID: ptr(m.ID),
	}, nil
}

func (s *Service) Reverse(ctx context.Context, movementID int64) (Balance, error) {
	entry := audit.Entry{
		Action:     audit.ActionStockReverse,
		EntityType: audit.EntityProduct,
		Detail:     map[string]any{"movement_id": movementID},
	}
	b, err := s.repo.Reverse(ctx, movementID, func(m MovementInfo) (Change, error) {
		return PlanReversal(m, s.now())
	}, entry)
	if err != nil {
		for _, known := range []error{
			ErrMovementNotFound, ErrNotReversible, ErrTooOld, ErrAlreadyReversed, ErrInsufficientStock,
		} {
			if errors.Is(err, known) {
				return Balance{}, err
			}
		}
		return Balance{}, fmt.Errorf("reverse movement: %w", err)
	}
	return b, nil
}

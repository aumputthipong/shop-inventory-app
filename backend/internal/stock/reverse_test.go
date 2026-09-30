package stock_test

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func TestPlanReversal(t *testing.T) {
	now := time.Date(2026, 10, 1, 12, 0, 0, 0, time.UTC)
	order := "order"
	earlier := int64(3)
	base := stock.MovementInfo{ID: 10, ProductID: 2, Type: stock.TypeStockIn, QtyChange: 50, CreatedAt: now.Add(-time.Hour)}

	tests := []struct {
		name    string
		mutate  func(*stock.MovementInfo)
		wantQty int32
		wantErr error
	}{
		{"mistyped stock-in is taken back out", func(*stock.MovementInfo) {}, -50, nil},
		{"an adjustment is undone the other way", func(m *stock.MovementInfo) { m.Type = stock.TypeAdjust; m.QtyChange = -2 }, 2, nil},
		{"still allowed near the end of the window", func(m *stock.MovementInfo) { m.CreatedAt = now.Add(-stock.ReversalWindow + time.Minute) }, -50, nil},
		{"too old", func(m *stock.MovementInfo) { m.CreatedAt = now.Add(-stock.ReversalWindow - time.Minute) }, 0, stock.ErrTooOld},
		{"only once", func(m *stock.MovementInfo) { m.Reversed = true }, 0, stock.ErrAlreadyReversed},
		{"not an undo of an undo", func(m *stock.MovementInfo) { m.Type = stock.TypeAdjust; m.ReversesID = &earlier }, 0, stock.ErrNotReversible},
		{"order movements go through the order", func(m *stock.MovementInfo) { m.Type = stock.TypeShip; m.RefType = &order }, 0, stock.ErrNotReversible},
		{"reservations are not reversible here", func(m *stock.MovementInfo) { m.Type = stock.TypeReserve; m.QtyChange = 0 }, 0, stock.ErrNotReversible},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := base
			tt.mutate(&m)
			change, err := stock.PlanReversal(m, now)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, stock.TypeAdjust, change.Type)
			assert.Equal(t, tt.wantQty, change.QtyChange)
			assert.Equal(t, stock.ReasonReversal, *change.Reason)
			assert.Equal(t, m.ID, *change.ReversesID)
		})
	}
}

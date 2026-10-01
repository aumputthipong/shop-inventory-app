package stock_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type fakeRepo struct {
	stock.Repository
	current stock.Balance
	applied *stock.Change
}

func (f *fakeRepo) Apply(_ context.Context, c stock.Change, check stock.Check, _ audit.Entry) (stock.Balance, error) {
	if check != nil {
		if err := check(f.current); err != nil {
			return stock.Balance{}, err
		}
	}
	f.applied = &c
	return stock.Balance{OnHand: f.current.OnHand + c.QtyChange, Reserved: f.current.Reserved}, nil
}

func TestStockIn(t *testing.T) {
	tests := []struct {
		name    string
		qty     int32
		wantErr error
	}{
		{"positive quantity", 5, nil},
		{"zero is rejected", 0, stock.ErrInvalidQty},
		{"negative is rejected", -2, stock.ErrInvalidQty},
		{"above the cap is rejected", stock.MaxQty + 1, stock.ErrInvalidQty},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{current: stock.Balance{OnHand: 8, Reserved: 5}}
			b, err := stock.NewService(repo).StockIn(t.Context(), stock.ReceiptInput{ProductID: 1, Qty: tt.qty, Note: "  lot 2  "})

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, repo.applied)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, int32(13), b.OnHand)
			assert.Equal(t, stock.TypeStockIn, repo.applied.Type)
			assert.Equal(t, "lot 2", *repo.applied.Note)
		})
	}
}

func TestAdjust(t *testing.T) {
	tests := []struct {
		name         string
		in           stock.AdjustInput
		wantErr      error
		wantShortage bool
	}{
		{"remove what is available", stock.AdjustInput{QtyChange: -3, Reason: stock.ReasonDamaged}, nil, false},
		{"add after a recount", stock.AdjustInput{QtyChange: 2, Reason: stock.ReasonCountCorrection}, nil, false},
		{"cannot remove units held by orders", stock.AdjustInput{QtyChange: -4, Reason: stock.ReasonLost}, stock.ErrInsufficientStock, true},
		{"zero is rejected", stock.AdjustInput{QtyChange: 0, Reason: stock.ReasonLost}, stock.ErrInvalidQty, false},
		{"unknown reason", stock.AdjustInput{QtyChange: 1, Reason: "gift"}, stock.ErrInvalidReason, false},
		{"other needs a note", stock.AdjustInput{QtyChange: 1, Reason: stock.ReasonOther, Note: "  "}, stock.ErrNoteRequired, false},
		{"other with a note", stock.AdjustInput{QtyChange: 1, Reason: stock.ReasonOther, Note: "found in back room"}, nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{current: stock.Balance{OnHand: 8, Reserved: 5}}
			_, err := stock.NewService(repo).Adjust(t.Context(), tt.in)

			if tt.wantErr == nil {
				require.NoError(t, err)
				assert.Equal(t, stock.TypeAdjust, repo.applied.Type)
				assert.Equal(t, string(tt.in.Reason), *repo.applied.Reason)
				return
			}
			require.ErrorIs(t, err, tt.wantErr)
			assert.Nil(t, repo.applied)
			if tt.wantShortage {
				var shortage *stock.ShortageError
				require.ErrorAs(t, err, &shortage)
				assert.Equal(t, int32(3), shortage.Available)
				assert.Equal(t, int32(5), shortage.Reserved)
			}
		})
	}
}

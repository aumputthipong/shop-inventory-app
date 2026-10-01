package stock_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type receiptRepo struct {
	stock.Repository
	got *stock.NewReceipt
}

func (r *receiptRepo) Receive(_ context.Context, in stock.NewReceipt, _ audit.Entry) (stock.Receipt, error) {
	r.got = &in
	return stock.Receipt{ID: 1}, nil
}

func TestReceiveValidates(t *testing.T) {
	tests := []struct {
		name    string
		in      stock.NewReceipt
		wantErr error
	}{
		{"one delivery, many products", stock.NewReceipt{Reference: " INV-9 ", Lines: []stock.ReceiptLine{{ProductID: 1, Qty: 5}, {ProductID: 2, Qty: 1}}}, nil},
		{"needs a line", stock.NewReceipt{}, stock.ErrInvalidReceipt},
		{"no zero quantities", stock.NewReceipt{Lines: []stock.ReceiptLine{{ProductID: 1, Qty: 0}}}, stock.ErrInvalidReceipt},
		{"no product twice", stock.NewReceipt{Lines: []stock.ReceiptLine{{ProductID: 1, Qty: 1}, {ProductID: 1, Qty: 2}}}, stock.ErrInvalidReceipt},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &receiptRepo{}
			_, err := stock.NewService(repo).Receive(t.Context(), tt.in)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, repo.got)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, "INV-9", repo.got.Reference)
		})
	}
}

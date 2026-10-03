//go:build integration

package stock_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/testdb"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func TestReceiveADeliveryAllOrNothing(t *testing.T) {
	pool := testdb.Pool(t)
	ctx := t.Context()

	tag := testdb.Unique("")
	productSvc := products.NewService(products.NewRepository(pool))
	newProduct := func(sku string) int64 {
		p, err := productSvc.Create(ctx, products.Input{SKU: sku + "-" + tag, Name: sku, Price: "1.00", IsActive: true, InitialQty: 2})
		require.NoError(t, err)
		return p.ID
	}
	a, b := newProduct("RCV-A"), newProduct("RCV-B")
	svc := stock.NewService(stock.NewRepository(pool))

	r, err := svc.Receive(ctx, stock.NewReceipt{Reference: "INV-" + tag, Lines: []stock.ReceiptLine{{ProductID: b, Qty: 10}, {ProductID: a, Qty: 3}}})
	require.NoError(t, err)
	require.Len(t, r.Lines, 2)
	assert.Equal(t, int32(12), r.Lines[0].Balance.OnHand)
	assert.Equal(t, int32(5), r.Lines[1].Balance.OnHand)

	moves, _, err := svc.ListMovements(ctx, stock.MovementFilter{ProductID: &a, Limit: 1})
	require.NoError(t, err)
	require.Len(t, moves, 1)
	assert.Equal(t, "INV-"+tag, *moves[0].ReceiptReference)

	_, err = svc.Reverse(ctx, moves[0].ID)
	require.NoError(t, err, "one mistyped line of a delivery can be undone")

	_, err = svc.Receive(ctx, stock.NewReceipt{Lines: []stock.ReceiptLine{{ProductID: a, Qty: 1}, {ProductID: 999_999_999, Qty: 1}}})
	require.ErrorIs(t, err, stock.ErrProductNotFound)
	p, err := productSvc.Get(ctx, a)
	require.NoError(t, err)
	assert.Equal(t, int32(2), p.OnHand, "the unknown product rolled the whole delivery back")
}

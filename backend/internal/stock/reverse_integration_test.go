//go:build integration

package stock_test

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func TestReverseAMistypedStockIn(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	require.NotEmpty(t, dsn, "integration tests need TEST_DATABASE_URL pointing at a migrated, disposable database")
	pool, err := database.NewPool(t.Context(), dsn)
	require.NoError(t, err)
	t.Cleanup(pool.Close)
	ctx := t.Context()

	suffix := make([]byte, 6)
	_, _ = rand.Read(suffix)
	p, err := products.NewService(products.NewRepository(pool)).Create(ctx, products.Input{
		SKU: "REV-" + hex.EncodeToString(suffix), Name: "reverse", Price: "1.00", IsActive: true, InitialQty: 5,
	})
	require.NoError(t, err)

	svc := stock.NewService(stock.NewRepository(pool))
	_, err = svc.StockIn(ctx, stock.ReceiptInput{ProductID: p.ID, Qty: 50})
	require.NoError(t, err)
	_, err = orders.NewService(orders.NewRepository(pool)).Create(ctx, orders.NewOrder{
		Items: []orders.ItemRequest{{ProductID: p.ID, Qty: 3}},
	})
	require.NoError(t, err)

	latestStockIn := func() stock.Movement {
		typ := stock.TypeStockIn
		moves, _, err := svc.ListMovements(ctx, stock.MovementFilter{ProductID: &p.ID, Type: &typ, Limit: 1})
		require.NoError(t, err)
		require.Len(t, moves, 1)
		return moves[0]
	}
	mistake := latestStockIn()

	b, err := svc.Reverse(ctx, mistake.ID)
	require.NoError(t, err)
	assert.Equal(t, int32(5), b.OnHand, "back to the opening stock")
	assert.True(t, latestStockIn().Reversed)

	_, err = svc.Reverse(ctx, mistake.ID)
	require.ErrorIs(t, err, stock.ErrAlreadyReversed)

	opening, _, err := svc.ListMovements(ctx, stock.MovementFilter{ProductID: &p.ID, Limit: 20})
	require.NoError(t, err)
	var openingID int64
	for _, m := range opening {
		if m.Reason != nil && *m.Reason == stock.ReasonOpeningBalance {
			openingID = m.ID
		}
	}
	_, err = svc.Reverse(ctx, openingID)
	require.ErrorIs(t, err, stock.ErrInsufficientStock, "3 of the 5 opening units are held by the order")
}

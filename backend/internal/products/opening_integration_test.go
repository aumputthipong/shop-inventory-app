//go:build integration

package products_test

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func TestOpeningStockIsRecordedInTheLedger(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	require.NotEmpty(t, dsn, "integration tests need TEST_DATABASE_URL pointing at a migrated, disposable database")
	pool, err := database.NewPool(t.Context(), dsn)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	suffix := make([]byte, 6)
	_, _ = rand.Read(suffix)
	d, err := products.NewService(products.NewRepository(pool)).Create(t.Context(), products.Input{
		SKU: "OPEN-" + hex.EncodeToString(suffix), Name: "opening", Price: "10.00", IsActive: true, InitialQty: 12,
	})
	require.NoError(t, err)
	assert.Equal(t, int32(12), d.OnHand)

	moves, _, err := stock.NewService(stock.NewRepository(pool)).ListMovements(t.Context(), stock.MovementFilter{ProductID: &d.ID, Limit: 10})
	require.NoError(t, err)
	require.Len(t, moves, 1)
	assert.Equal(t, stock.TypeStockIn, moves[0].Type)
	assert.Equal(t, stock.ReasonOpeningBalance, *moves[0].Reason)
	assert.Equal(t, int32(12), moves[0].OnHandAfter)
}

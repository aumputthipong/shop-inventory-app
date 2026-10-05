//go:build integration

package orders

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/testdb"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
)

// Every row in one transaction shares now(), so a one-microsecond day holds
// exactly this test's orders even while other packages write to the same database.
func TestSalesCountsOneDay(t *testing.T) {
	ctx := t.Context()
	pool := testdb.Pool(t)
	p, err := products.NewService(products.NewRepository(pool)).Create(ctx, products.Input{
		SKU: testdb.Unique("SALES-"), Name: "sales test item", Price: "100.00", IsActive: true,
	})
	require.NoError(t, err)

	tx, err := pool.Begin(ctx)
	require.NoError(t, err)
	t.Cleanup(func() { _ = tx.Rollback(ctx) })
	q := sqlc.New(tx)

	place := func(channel string, qty int32, price string) int64 {
		row, err := q.CreateOrder(ctx, sqlc.CreateOrderParams{Channel: channel})
		require.NoError(t, err)
		require.NoError(t, q.InsertOrderItem(ctx, sqlc.InsertOrderItemParams{
			OrderID: row.ID, ProductID: p.ID, Qty: qty, UnitPrice: price,
		}))
		require.NoError(t, q.RefreshOrderTotal(ctx, row.ID))
		return row.ID
	}
	store := place("store", 2, "100.00")
	place("line", 1, "250.00")
	place("line", 3, "100.00")
	canceled := place("shopee", 1, "999.00")
	require.NoError(t, q.SetOrderStatus(ctx, sqlc.SetOrderStatusParams{Status: "shipped", ID: store}))
	require.NoError(t, q.SetOrderStatus(ctx, sqlc.SetOrderStatusParams{Status: "canceled", ID: canceled}))

	o, err := q.GetOrder(ctx, store)
	require.NoError(t, err)
	day := Day{Date: "test", Start: o.CreatedAt, End: o.CreatedAt.Add(time.Microsecond)}

	got, err := salesOn(ctx, q, day)

	require.NoError(t, err)
	assert.Equal(t, int32(3), got.Orders, "the canceled order is left out")
	assert.Equal(t, "750.00", got.Revenue)
	assert.Equal(t, int32(1), got.Shipped)
	assert.Equal(t, []ChannelSales{
		{Channel: ChannelLine, Orders: 2, Revenue: "550.00"},
		{Channel: ChannelStore, Orders: 1, Revenue: "200.00"},
	}, got.Channels)
}

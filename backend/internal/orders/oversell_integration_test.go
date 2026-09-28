//go:build integration

package orders_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

type env struct {
	pool     *pgxpool.Pool
	products *products.Service
	stock    *stock.Service
	orders   *orders.Service
}

func newEnv(t *testing.T) env {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	require.NotEmpty(t, dsn, "integration tests need TEST_DATABASE_URL pointing at a migrated, disposable database")

	pool, err := database.NewPool(t.Context(), dsn)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	return env{
		pool:     pool,
		products: products.NewService(products.NewRepository(pool)),
		stock:    stock.NewService(stock.NewRepository(pool)),
		orders:   orders.NewService(orders.NewRepository(pool)),
	}
}

func (e env) product(t *testing.T, onHand int32) int64 {
	t.Helper()
	suffix := make([]byte, 6)
	_, _ = rand.Read(suffix)

	p, err := e.products.Create(t.Context(), products.Input{
		SKU: "IT-" + hex.EncodeToString(suffix), Name: "race test item", Price: "10.00", IsActive: true,
	})
	require.NoError(t, err)
	_, err = e.stock.StockIn(t.Context(), stock.ReceiptInput{ProductID: p.ID, Qty: onHand})
	require.NoError(t, err)
	return p.ID
}

func (e env) balance(t *testing.T, productID int64) products.Product {
	t.Helper()
	d, err := e.products.Get(t.Context(), productID)
	require.NoError(t, err)
	return d.Product
}

// assertLedgerExplainsBalance checks that the movements alone rebuild the stored balance.
func (e env) assertLedgerExplainsBalance(t *testing.T, productID int64) {
	t.Helper()
	moves, _, err := e.stock.ListMovements(t.Context(), stock.MovementFilter{ProductID: &productID, Limit: 200})
	require.NoError(t, err)

	var onHand, reserved int32
	for _, m := range moves {
		onHand += m.QtyChange
		reserved += m.ReservedChange
	}
	b := e.balance(t, productID)
	assert.Equal(t, b.OnHand, onHand, "ledger on_hand")
	assert.Equal(t, b.Reserved, reserved, "ledger reserved")
}

// race starts every attempt at once so they all contend for the same rows.
func race(n int, attempt func(i int) error) []error {
	var wg sync.WaitGroup
	start := make(chan struct{})
	errs := make([]error, n)
	for i := range n {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			errs[i] = attempt(i)
		}()
	}
	close(start)
	wg.Wait()
	return errs
}

func TestConcurrentOrdersNeverOversell(t *testing.T) {
	e := newEnv(t)
	const stockOnHand, buyers = 5, 40
	productID := e.product(t, stockOnHand)

	errs := race(buyers, func(int) error {
		_, err := e.orders.Create(context.Background(), orders.NewOrder{
			Channel: orders.ChannelShopee,
			Items:   []orders.ItemRequest{{ProductID: productID, Qty: 1}},
		})
		return err
	})

	var sold, rejected int
	for _, err := range errs {
		switch {
		case err == nil:
			sold++
		case errors.Is(err, stock.ErrInsufficientStock):
			rejected++
		default:
			t.Fatalf("unexpected error: %v", err)
		}
	}

	assert.Equal(t, stockOnHand, sold, "exactly the units on hand are sold")
	assert.Equal(t, buyers-stockOnHand, rejected)

	b := e.balance(t, productID)
	assert.Equal(t, int32(stockOnHand), b.OnHand)
	assert.Equal(t, int32(stockOnHand), b.Reserved)
	assert.Equal(t, int32(0), b.Available())
	e.assertLedgerExplainsBalance(t, productID)
}

func TestMultiItemOrdersAreAllOrNothingUnderContention(t *testing.T) {
	e := newEnv(t)
	a := e.product(t, 4)
	b := e.product(t, 4)

	shapes := [][]orders.ItemRequest{
		{{ProductID: a, Qty: 1}, {ProductID: b, Qty: 1}},
		{{ProductID: b, Qty: 2}, {ProductID: a, Qty: 1}},
		{{ProductID: a, Qty: 2}},
	}

	var mu sync.Mutex
	var placed []orders.Order
	errs := race(30, func(i int) error {
		o, err := e.orders.Create(context.Background(), orders.NewOrder{Items: shapes[i%len(shapes)]})
		if err == nil {
			mu.Lock()
			placed = append(placed, o)
			mu.Unlock()
		}
		return err
	})
	for _, err := range errs {
		if err != nil {
			require.ErrorIs(t, err, stock.ErrInsufficientStock)
		}
	}
	require.NotEmpty(t, placed)

	want := map[int64]int32{}
	for _, o := range placed {
		for _, item := range o.Items {
			want[item.ProductID] += item.Qty
		}
	}
	for _, id := range []int64{a, b} {
		got := e.balance(t, id)
		assert.Equal(t, want[id], got.Reserved, "reserved equals the sum of accepted orders, so no order was half reserved")
		assert.LessOrEqual(t, got.Reserved, got.OnHand)
		e.assertLedgerExplainsBalance(t, id)
	}
}

func TestShipAndCancelKeepLedgerAndBalanceInStep(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	productID := e.product(t, 10)

	create := func(qty int32) orders.Order {
		o, err := e.orders.Create(ctx, orders.NewOrder{Items: []orders.ItemRequest{{ProductID: productID, Qty: qty}}})
		require.NoError(t, err)
		return o
	}
	shipped, canceled := create(3), create(4)

	_, err := e.orders.Apply(ctx, shipped.ID, orders.ActionPack)
	require.NoError(t, err)
	_, err = e.orders.Apply(ctx, shipped.ID, orders.ActionShip)
	require.NoError(t, err)
	_, err = e.orders.Apply(ctx, canceled.ID, orders.ActionCancel)
	require.NoError(t, err)

	_, err = e.orders.Apply(ctx, shipped.ID, orders.ActionCancel)
	var te *orders.TransitionError
	require.ErrorAs(t, err, &te, "a shipped order cannot release stock again")

	b := e.balance(t, productID)
	assert.Equal(t, int32(7), b.OnHand)
	assert.Equal(t, int32(0), b.Reserved)
	e.assertLedgerExplainsBalance(t, productID)
}

func TestAdjustCannotTakeReservedUnits(t *testing.T) {
	e := newEnv(t)
	ctx := t.Context()
	productID := e.product(t, 8)
	_, err := e.orders.Create(ctx, orders.NewOrder{Items: []orders.ItemRequest{{ProductID: productID, Qty: 5}}})
	require.NoError(t, err)

	_, err = e.stock.Adjust(ctx, stock.AdjustInput{ProductID: productID, QtyChange: -4, Reason: stock.ReasonDamaged})
	require.ErrorIs(t, err, stock.ErrInsufficientStock)

	b, err := e.stock.Adjust(ctx, stock.AdjustInput{ProductID: productID, QtyChange: -3, Reason: stock.ReasonDamaged})
	require.NoError(t, err)
	assert.Equal(t, int32(0), b.Available())
	e.assertLedgerExplainsBalance(t, productID)
}

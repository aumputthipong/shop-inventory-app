//go:build integration

package counts_test

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/counts"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func TestCountCorrectsStockThroughTheLedger(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	require.NotEmpty(t, dsn, "integration tests need TEST_DATABASE_URL pointing at a migrated, disposable database")
	pool, err := database.NewPool(t.Context(), dsn)
	require.NoError(t, err)
	t.Cleanup(pool.Close)

	suffix := make([]byte, 6)
	_, _ = rand.Read(suffix)
	tag := hex.EncodeToString(suffix)

	q := sqlc.New(pool)
	userAs := func(role actor.Role) context.Context {
		u, err := q.CreateUser(t.Context(), sqlc.CreateUserParams{
			Email: string(role) + "-" + tag + "@count.test", PasswordHash: "x", Name: string(role), Role: string(role),
		})
		require.NoError(t, err)
		return actor.With(t.Context(), actor.Actor{UserID: u.ID, Role: role})
	}
	owner, staff := userAs(actor.RoleOwner), userAs(actor.RoleStaff)

	productSvc := products.NewService(products.NewRepository(pool))
	newProduct := func(sku string, qty int32) int64 {
		p, err := productSvc.Create(owner, products.Input{
			SKU: sku + "-" + tag, Name: sku, Price: "1.00", IsActive: true, InitialQty: qty,
		})
		require.NoError(t, err)
		return p.ID
	}
	shirt, mug := newProduct("CNT-A", 10), newProduct("CNT-B", 6)

	_, err = orders.NewService(orders.NewRepository(pool)).Create(owner, orders.NewOrder{
		Items: []orders.ItemRequest{{ProductID: mug, Qty: 4}},
	})
	require.NoError(t, err)

	svc := counts.NewService(counts.NewRepository(pool))

	t.Run("staff submit, owner approves, balances follow the count", func(t *testing.T) {
		c, err := svc.Create(staff, counts.NewCount{Lines: []counts.LineInput{
			{ProductID: shirt, Counted: 8}, {ProductID: mug, Counted: 6},
		}})
		require.NoError(t, err)
		assert.Equal(t, counts.StatusSubmitted, c.Status)

		_, err = svc.Approve(staff, c.ID)
		require.ErrorIs(t, err, counts.ErrOwnerOnly)

		c, err = svc.Approve(owner, c.ID)
		require.NoError(t, err)
		assert.Equal(t, counts.StatusApproved, c.Status)

		p, err := productSvc.Get(owner, shirt)
		require.NoError(t, err)
		assert.Equal(t, int32(8), p.OnHand)

		moves, _, err := stock.NewService(stock.NewRepository(pool)).ListMovements(owner, stock.MovementFilter{ProductID: &shirt, Limit: 1})
		require.NoError(t, err)
		require.Len(t, moves, 1)
		assert.Equal(t, int32(-2), moves[0].QtyChange)
		assert.Equal(t, stock.RefStockCount, *moves[0].RefType)
		assert.Equal(t, c.ID, *moves[0].RefID)

		_, err = svc.Approve(owner, c.ID)
		var state *counts.StateError
		require.ErrorAs(t, err, &state)
		assert.Equal(t, counts.StatusApproved, state.Status)

		_, err = stock.NewService(stock.NewRepository(pool)).Reverse(owner, moves[0].ID)
		require.ErrorIs(t, err, stock.ErrNotReversible, "a count adjustment is corrected by another count")
	})

	t.Run("a count cannot take units that orders hold", func(t *testing.T) {
		_, err := svc.Create(owner, counts.NewCount{Approve: true, Lines: []counts.LineInput{{ProductID: mug, Counted: 1}}})
		var shortage *counts.InsufficientStockError
		require.ErrorAs(t, err, &shortage)
		assert.Equal(t, int32(2), shortage.Items[0].Available)

		p, err := productSvc.Get(owner, mug)
		require.NoError(t, err)
		assert.Equal(t, int32(6), p.OnHand, "the whole submit and approve rolled back")
	})

	t.Run("a rejected count leaves stock alone", func(t *testing.T) {
		c, err := svc.Create(staff, counts.NewCount{Lines: []counts.LineInput{{ProductID: shirt, Counted: 0}}})
		require.NoError(t, err)
		c, err = svc.Reject(owner, c.ID)
		require.NoError(t, err)
		assert.Equal(t, counts.StatusRejected, c.Status)

		p, err := productSvc.Get(owner, shirt)
		require.NoError(t, err)
		assert.Equal(t, int32(8), p.OnHand)
	})
}

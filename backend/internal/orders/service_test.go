package orders_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func locked(rows ...stock.LockedRow) map[int64]stock.LockedRow {
	m := make(map[int64]stock.LockedRow, len(rows))
	for _, r := range rows {
		m[r.ProductID] = r
	}
	return m
}

func row(id int64, onHand, reserved int32) stock.LockedRow {
	return stock.LockedRow{
		ProductID: id, SKU: "SKU", Name: "item", Price: "100.00", IsActive: true,
		Balance: stock.Balance{OnHand: onHand, Reserved: reserved},
	}
}

func TestPlanReservation(t *testing.T) {
	inactive := row(3, 10, 0)
	inactive.IsActive = false

	tests := []struct {
		name          string
		items         []orders.ItemRequest
		rows          map[int64]stock.LockedRow
		wantLines     int
		wantShortages []int64
		wantErr       error
	}{
		{
			name:      "every line fits",
			items:     []orders.ItemRequest{{ProductID: 1, Qty: 3}, {ProductID: 2, Qty: 1}},
			rows:      locked(row(1, 8, 5), row(2, 1, 0)),
			wantLines: 2,
		},
		{
			name:          "one short line rejects the whole order",
			items:         []orders.ItemRequest{{ProductID: 1, Qty: 4}, {ProductID: 2, Qty: 1}},
			rows:          locked(row(1, 8, 5), row(2, 1, 0)),
			wantShortages: []int64{1},
		},
		{
			name:          "reports every short line, not only the first",
			items:         []orders.ItemRequest{{ProductID: 1, Qty: 4}, {ProductID: 2, Qty: 2}},
			rows:          locked(row(1, 8, 5), row(2, 1, 0)),
			wantShortages: []int64{1, 2},
		},
		{
			name:    "unknown product",
			items:   []orders.ItemRequest{{ProductID: 9, Qty: 1}},
			rows:    locked(row(1, 8, 0)),
			wantErr: orders.ErrProductUnavailable,
		},
		{
			name:    "inactive product",
			items:   []orders.ItemRequest{{ProductID: 3, Qty: 1}},
			rows:    locked(inactive),
			wantErr: orders.ErrProductUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lines, err := orders.PlanReservation(tt.items, tt.rows)

			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			if tt.wantShortages != nil {
				var shortage *orders.InsufficientStockError
				require.ErrorAs(t, err, &shortage)
				require.ErrorIs(t, err, stock.ErrInsufficientStock)
				got := make([]int64, 0, len(shortage.Items))
				for _, s := range shortage.Items {
					got = append(got, s.ProductID)
				}
				assert.Equal(t, tt.wantShortages, got)
				assert.Nil(t, lines)
				return
			}
			require.NoError(t, err)
			assert.Len(t, lines, tt.wantLines)
			assert.Equal(t, "100.00", lines[0].UnitPrice)
		})
	}
}

func TestPlanTransition(t *testing.T) {
	tests := []struct {
		from       orders.Status
		action     orders.Action
		wantTo     orders.Status
		wantEffect orders.Effect
		wantErr    bool
	}{
		{orders.StatusReserved, orders.ActionPack, orders.StatusPacked, orders.EffectNone, false},
		{orders.StatusPacked, orders.ActionShip, orders.StatusShipped, orders.EffectShip, false},
		{orders.StatusReserved, orders.ActionCancel, orders.StatusCanceled, orders.EffectRelease, false},
		{orders.StatusPacked, orders.ActionCancel, orders.StatusCanceled, orders.EffectRelease, false},
		{orders.StatusReserved, orders.ActionShip, "", 0, true},
		{orders.StatusShipped, orders.ActionCancel, "", 0, true},
		{orders.StatusCanceled, orders.ActionPack, "", 0, true},
		{orders.StatusPacked, orders.ActionPack, "", 0, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.action)+" from "+string(tt.from), func(t *testing.T) {
			got, err := orders.PlanTransition(tt.from, tt.action)
			if tt.wantErr {
				var te *orders.TransitionError
				require.ErrorAs(t, err, &te)
				assert.Equal(t, tt.from, te.From)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.wantTo, got.To)
			assert.Equal(t, tt.wantEffect, got.Effect)
		})
	}
}

type fakeRepo struct {
	orders.Repository
	createErr error
	rejected  *orders.InsufficientStockError
	created   orders.NewOrder
}

func (f *fakeRepo) Create(_ context.Context, in orders.NewOrder, plan orders.ReservationPlanner) (int64, error) {
	f.created = in
	if f.createErr != nil {
		return 0, f.createErr
	}
	if _, err := plan(locked(row(1, 1, 0))); err != nil {
		return 0, err
	}
	return 7, nil
}

func (f *fakeRepo) RecordRejection(_ context.Context, _ orders.NewOrder, r *orders.InsufficientStockError) error {
	f.rejected = r
	return nil
}

func (f *fakeRepo) Get(_ context.Context, id int64) (orders.Order, error) {
	return orders.Order{ID: id}, nil
}

type countingNotifier struct {
	seen []int64
}

func (n *countingNotifier) OrderUpdated(_ context.Context, o orders.Order) {
	n.seen = append(n.seen, o.ID)
}

func (f *fakeRepo) Transition(context.Context, int64, orders.Action, orders.TransitionPlanner) error {
	return nil
}

func TestNotifierHearsCommittedChangesOnly(t *testing.T) {
	n := &countingNotifier{}
	svc := orders.NewService(&fakeRepo{}).WithNotifier(n)

	_, err := svc.Create(t.Context(), orders.NewOrder{Items: []orders.ItemRequest{{ProductID: 1, Qty: 1}}})
	require.NoError(t, err)
	_, err = svc.Apply(t.Context(), 7, orders.ActionPack)
	require.NoError(t, err)
	_, err = svc.Create(t.Context(), orders.NewOrder{Items: []orders.ItemRequest{{ProductID: 1, Qty: 5}}})
	require.Error(t, err)

	assert.Equal(t, []int64{7, 7}, n.seen, "a rejected order sends nothing")
}

func TestLineCustomerNeedsLineChannel(t *testing.T) {
	repo := &fakeRepo{}
	_, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{
		Channel: orders.ChannelShopee, Items: []orders.ItemRequest{{ProductID: 1, Qty: 1}},
		Customer: &orders.Customer{Name: "x", LineUserID: "U1"},
	})
	require.ErrorIs(t, err, orders.ErrInvalidOrder)
}

func TestCreateValidatesBeforeTouchingStock(t *testing.T) {
	tests := []struct {
		name  string
		items []orders.ItemRequest
	}{
		{"no items", nil},
		{"zero quantity", []orders.ItemRequest{{ProductID: 1, Qty: 0}}},
		{"duplicate product", []orders.ItemRequest{{ProductID: 1, Qty: 1}, {ProductID: 1, Qty: 2}}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{}
			_, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{Items: tt.items})
			require.ErrorIs(t, err, orders.ErrInvalidOrder)
			assert.Empty(t, repo.created.Items)
		})
	}
}

func TestOnlyStoreSalesAreHandedOverAtOnce(t *testing.T) {
	repo := &fakeRepo{}
	_, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{
		Channel: orders.ChannelShopee, HandedOver: true, Items: []orders.ItemRequest{{ProductID: 1, Qty: 1}},
	})
	require.ErrorIs(t, err, orders.ErrInvalidOrder)
	assert.Empty(t, repo.created.Items)
}

func TestCreateDefaultsToStoreChannel(t *testing.T) {
	repo := &fakeRepo{}
	o, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{
		Items: []orders.ItemRequest{{ProductID: 1, Qty: 1}},
	})
	require.NoError(t, err)
	assert.Equal(t, int64(7), o.ID)
	assert.Equal(t, orders.ChannelStore, repo.created.Channel)
}

func TestCreateRecordsRejectedAttempts(t *testing.T) {
	repo := &fakeRepo{}
	_, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{
		Items: []orders.ItemRequest{{ProductID: 1, Qty: 2}},
	})
	require.ErrorIs(t, err, stock.ErrInsufficientStock)
	require.NotNil(t, repo.rejected)
	assert.Equal(t, int32(1), repo.rejected.Items[0].Available)
}

func TestCreatePassesThroughExternalRefConflict(t *testing.T) {
	repo := &fakeRepo{createErr: orders.ErrExternalRefTaken}
	_, err := orders.NewService(repo).Create(t.Context(), orders.NewOrder{
		Channel: orders.ChannelShopee, ExternalRef: "SHP-1",
		Items: []orders.ItemRequest{{ProductID: 1, Qty: 1}},
	})
	assert.True(t, errors.Is(err, orders.ErrExternalRefTaken))
}

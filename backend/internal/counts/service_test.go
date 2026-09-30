package counts_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/counts"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

func locked(onHand, reserved int32, ids ...int64) map[int64]stock.LockedRow {
	m := make(map[int64]stock.LockedRow, len(ids))
	for _, id := range ids {
		m[id] = stock.LockedRow{ProductID: id, Balance: stock.Balance{OnHand: onHand, Reserved: reserved}}
	}
	return m
}

func TestPlanApproval(t *testing.T) {
	tests := []struct {
		name          string
		lines         []counts.Line
		rows          map[int64]stock.LockedRow
		wantChanges   map[int64]int32
		wantShortages []int64
	}{
		{
			name:        "matching lines change nothing",
			lines:       []counts.Line{{ProductID: 1, Expected: 10, Counted: 10}},
			rows:        locked(10, 0, 1),
			wantChanges: map[int64]int32{},
		},
		{
			name: "found and missing units become adjustments",
			lines: []counts.Line{
				{ProductID: 1, Expected: 10, Counted: 12},
				{ProductID: 2, Expected: 10, Counted: 7},
			},
			rows:        locked(10, 0, 1, 2),
			wantChanges: map[int64]int32{1: 2, 2: -3},
		},
		{
			name:          "cannot remove units that orders hold",
			lines:         []counts.Line{{ProductID: 1, Expected: 10, Counted: 2}, {ProductID: 2, Expected: 5, Counted: 6}},
			rows:          locked(10, 4, 1, 2),
			wantShortages: []int64{1},
		},
		{
			name:        "variance uses the saved count, not stock that moved since",
			lines:       []counts.Line{{ProductID: 1, Expected: 10, Counted: 9, OnHandNow: 4}},
			rows:        locked(4, 0, 1),
			wantChanges: map[int64]int32{1: -1},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			changes, err := counts.PlanApproval(7, tt.lines, tt.rows)

			if tt.wantShortages != nil {
				var shortage *counts.InsufficientStockError
				require.ErrorAs(t, err, &shortage)
				require.ErrorIs(t, err, stock.ErrInsufficientStock)
				ids := make([]int64, 0, len(shortage.Items))
				for _, s := range shortage.Items {
					ids = append(ids, s.ProductID)
				}
				assert.Equal(t, tt.wantShortages, ids)
				return
			}

			require.NoError(t, err)
			got := map[int64]int32{}
			for _, c := range changes {
				got[c.ProductID] = c.QtyChange
				assert.Equal(t, stock.TypeAdjust, c.Type)
				assert.Equal(t, string(stock.ReasonCountCorrection), *c.Reason)
				assert.Equal(t, stock.RefStockCount, *c.RefType)
				assert.Equal(t, int64(7), *c.RefID)
			}
			assert.Equal(t, tt.wantChanges, got)
		})
	}
}

type fakeRepo struct {
	counts.Repository
	created *counts.NewCount
	decided counts.Status
}

func (f *fakeRepo) Create(_ context.Context, in counts.NewCount, _ counts.ApprovalPlanner) (int64, error) {
	f.created = &in
	return 1, nil
}

func (f *fakeRepo) Decide(_ context.Context, _ int64, to counts.Status, _ counts.ApprovalPlanner) error {
	f.decided = to
	return nil
}

func (f *fakeRepo) Get(context.Context, int64) (counts.Count, error) {
	return counts.Count{ID: 1}, nil
}

func as(role actor.Role) context.Context {
	return actor.With(context.Background(), actor.Actor{UserID: 1, Role: role})
}

func TestCreateValidates(t *testing.T) {
	tests := []struct {
		name    string
		ctx     context.Context
		in      counts.NewCount
		wantErr error
	}{
		{"staff can submit", as(actor.RoleStaff), counts.NewCount{Lines: []counts.LineInput{{ProductID: 1, Counted: 0}}}, nil},
		{"owner can submit and approve", as(actor.RoleOwner), counts.NewCount{Approve: true, Lines: []counts.LineInput{{ProductID: 1, Counted: 3}}}, nil},
		{"staff cannot approve", as(actor.RoleStaff), counts.NewCount{Approve: true, Lines: []counts.LineInput{{ProductID: 1, Counted: 3}}}, counts.ErrOwnerOnly},
		{"needs at least one line", as(actor.RoleOwner), counts.NewCount{}, counts.ErrInvalidCount},
		{"no negative counts", as(actor.RoleOwner), counts.NewCount{Lines: []counts.LineInput{{ProductID: 1, Counted: -1}}}, counts.ErrInvalidCount},
		{"no product twice", as(actor.RoleOwner), counts.NewCount{Lines: []counts.LineInput{{ProductID: 1, Counted: 1}, {ProductID: 1, Counted: 2}}}, counts.ErrInvalidCount},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{}
			_, err := counts.NewService(repo).Create(tt.ctx, tt.in)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, repo.created)
				return
			}
			require.NoError(t, err)
			assert.NotNil(t, repo.created)
		})
	}
}

func TestOnlyOwnersDecide(t *testing.T) {
	repo := &fakeRepo{}
	svc := counts.NewService(repo)

	_, err := svc.Approve(as(actor.RoleStaff), 1)
	require.ErrorIs(t, err, counts.ErrOwnerOnly)

	_, err = svc.Reject(as(actor.RoleOwner), 1)
	require.NoError(t, err)
	assert.Equal(t, counts.StatusRejected, repo.decided)
}

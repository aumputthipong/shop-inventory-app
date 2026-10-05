package orders_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
)

func TestDayOf(t *testing.T) {
	bangkok, err := time.LoadLocation("Asia/Bangkok")
	require.NoError(t, err)

	tests := []struct {
		name      string
		at        time.Time
		wantDate  string
		wantStart time.Time
	}{
		{
			name:      "just after midnight in Bangkok is still the previous day in UTC",
			at:        time.Date(2026, 10, 4, 17, 30, 0, 0, time.UTC),
			wantDate:  "2026-10-05",
			wantStart: time.Date(2026, 10, 4, 17, 0, 0, 0, time.UTC),
		},
		{
			name:      "late evening in Bangkok",
			at:        time.Date(2026, 10, 5, 16, 59, 59, 0, time.UTC),
			wantDate:  "2026-10-05",
			wantStart: time.Date(2026, 10, 4, 17, 0, 0, 0, time.UTC),
		},
		{
			name:      "midnight starts the next day",
			at:        time.Date(2026, 10, 5, 17, 0, 0, 0, time.UTC),
			wantDate:  "2026-10-06",
			wantStart: time.Date(2026, 10, 5, 17, 0, 0, 0, time.UTC),
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			day := orders.DayOf(tt.at, bangkok)
			assert.Equal(t, tt.wantDate, day.Date)
			assert.True(t, tt.wantStart.Equal(day.Start), "start %s", day.Start)
			assert.Equal(t, 24*time.Hour, day.End.Sub(day.Start))
		})
	}
}

type salesRepo struct {
	orders.Repository
	got   orders.Day
	sales orders.Sales
}

func (r *salesRepo) Sales(_ context.Context, day orders.Day) (orders.Sales, error) {
	r.got = day
	return r.sales, nil
}

func TestTodayUsesTheShopDayAndListsEveryChannel(t *testing.T) {
	bangkok, err := time.LoadLocation("Asia/Bangkok")
	require.NoError(t, err)
	repo := &salesRepo{sales: orders.Sales{
		Orders: 2, Revenue: "750.00", Shipped: 1,
		Channels: []orders.ChannelSales{{Channel: orders.ChannelLine, Orders: 2, Revenue: "750.00"}},
	}}
	svc := orders.NewService(repo).WithZone(bangkok).WithClock(func() time.Time {
		return time.Date(2026, 10, 4, 18, 0, 0, 0, time.UTC)
	})

	got, err := svc.Today(t.Context())

	require.NoError(t, err)
	assert.Equal(t, "2026-10-05", repo.got.Date)
	assert.Equal(t, "2026-10-05", got.Date)
	assert.Equal(t, []orders.ChannelSales{
		{Channel: orders.ChannelStore, Revenue: "0.00"},
		{Channel: orders.ChannelShopee, Revenue: "0.00"},
		{Channel: orders.ChannelLine, Orders: 2, Revenue: "750.00"},
	}, got.Channels)
}

package products_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
)

func TestStatus(t *testing.T) {
	tests := []struct {
		name     string
		onHand   int32
		reserved int32
		want     products.StockStatus
	}{
		{"plenty", 24, 6, products.StatusInStock},
		{"at the threshold counts as low", 10, 5, products.StatusLow},
		{"below the threshold", 8, 5, products.StatusLow},
		{"everything reserved", 4, 4, products.StatusOutOfStock},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := products.Product{OnHand: tt.onHand, Reserved: tt.reserved, LowStockThreshold: 5}
			assert.Equal(t, tt.want, p.Status())
		})
	}
}

type fakeRepo struct {
	products.Repository
	current products.Product
	saved   *products.Input
	changed []string
}

func (f *fakeRepo) Get(context.Context, int64) (products.Product, error) {
	return f.current, nil
}

func (f *fakeRepo) Holds(context.Context, int64) ([]products.Hold, error) {
	return nil, nil
}

func (f *fakeRepo) Create(_ context.Context, in products.Input) (int64, error) {
	f.saved = &in
	return 1, nil
}

func (f *fakeRepo) Update(_ context.Context, _ int64, in products.Input, changed []string) error {
	f.saved = &in
	f.changed = changed
	return nil
}

func TestCreateValidation(t *testing.T) {
	valid := products.Input{SKU: "SKU-0005", Name: "ไดร์เป่าผม", Price: "899.50"}
	tests := []struct {
		name    string
		mutate  func(*products.Input)
		wantErr error
	}{
		{"valid", func(*products.Input) {}, nil},
		{"sku with spaces", func(in *products.Input) { in.SKU = "SKU 5" }, products.ErrInvalidSKU},
		{"blank name", func(in *products.Input) { in.Name = "   " }, products.ErrInvalidName},
		{"three decimals", func(in *products.Input) { in.Price = "1.005" }, products.ErrInvalidPrice},
		{"negative price", func(in *products.Input) { in.Price = "-1" }, products.ErrInvalidPrice},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := valid
			tt.mutate(&in)
			repo := &fakeRepo{}
			_, err := products.NewService(repo).Create(t.Context(), in)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Nil(t, repo.saved)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, "ไดร์เป่าผม", repo.saved.Name)
		})
	}
}

func TestUpdateOnlyChangesWhatWasSent(t *testing.T) {
	repo := &fakeRepo{current: products.Product{
		ID: 1, SKU: "SKU-0002", Name: "jeans", Price: "600.00", LowStockThreshold: 5, IsActive: true,
	}}
	inactive := false

	_, err := products.NewService(repo).Update(t.Context(), 1, products.Patch{IsActive: &inactive})

	require.NoError(t, err)
	assert.Equal(t, []string{"is_active"}, repo.changed)
	assert.False(t, repo.saved.IsActive)
	assert.Equal(t, "600.00", repo.saved.Price)
	assert.Equal(t, "SKU-0002", repo.saved.SKU)
}

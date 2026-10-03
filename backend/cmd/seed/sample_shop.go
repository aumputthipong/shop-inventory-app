package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

// seedSampleShop goes through the real services, so sample stock has a ledger like any other.
func seedSampleShop(ctx context.Context, pool *pgxpool.Pool) error {
	productSvc := products.NewService(products.NewRepository(pool))
	stockSvc := stock.NewService(stock.NewRepository(pool))
	orderSvc := orders.NewService(orders.NewRepository(pool))

	ids := make(map[string]int64, len(sampleCatalog))
	for _, p := range sampleCatalog {
		d, err := productSvc.Create(ctx, products.Input{
			SKU: p.sku, Name: p.name, Price: p.price, LowStockThreshold: p.threshold, IsActive: true,
		})
		if err != nil {
			return fmt.Errorf("create product %s: %w", p.sku, err)
		}
		ids[p.sku] = d.ID
		if _, err := stockSvc.StockIn(ctx, stock.ReceiptInput{ProductID: d.ID, Qty: p.qty, Note: sampleStockNote}); err != nil {
			return fmt.Errorf("stock in %s: %w", p.sku, err)
		}
	}

	for _, s := range sampleOrders {
		items := make([]orders.ItemRequest, 0, len(s.items))
		for sku, qty := range s.items {
			items = append(items, orders.ItemRequest{ProductID: ids[sku], Qty: qty})
		}
		o, err := orderSvc.Create(ctx, orders.NewOrder{Channel: s.channel, ExternalRef: s.externalRef, Items: items})
		if errors.Is(err, stock.ErrInsufficientStock) {
			slog.Info("sample order rejected as expected", slog.String("external_ref", s.externalRef))
			continue
		}
		if err != nil {
			return fmt.Errorf("create sample order: %w", err)
		}
		if s.pack {
			if _, err := orderSvc.Apply(ctx, o.ID, orders.ActionPack); err != nil {
				return fmt.Errorf("pack sample order: %w", err)
			}
		}
	}
	return nil
}

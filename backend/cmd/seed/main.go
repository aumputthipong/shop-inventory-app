// Command seed creates the first owner (and optionally a staff account and sample stock) on an empty database.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/users"
)

func main() {
	if err := run(); err != nil {
		slog.Error("seed failed", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

type account struct {
	email, password, name string
	role                  actor.Role
}

type sampleProduct struct {
	sku, name, price string
	threshold, qty   int32
}

type sampleOrder struct {
	channel     orders.Channel
	externalRef string
	items       map[string]int32
	pack        bool
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if cfg.AppEnv == config.EnvProduction && os.Getenv("SEED_SAMPLE_DATA") != "false" {
		return errors.New("refusing to add sample data to production; set SEED_SAMPLE_DATA=false")
	}

	owner := account{os.Getenv("SEED_OWNER_EMAIL"), os.Getenv("SEED_OWNER_PASSWORD"), "พลอย", actor.RoleOwner}
	staff := account{os.Getenv("SEED_STAFF_EMAIL"), os.Getenv("SEED_STAFF_PASSWORD"), "ณัฐ", actor.RoleStaff}
	if owner.email == "" || owner.password == "" {
		return errors.New("SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD are required")
	}

	ctx := context.Background()
	pool, err := database.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer pool.Close()

	q := sqlc.New(pool)
	count, err := q.CountUsers(ctx)
	if err != nil {
		return fmt.Errorf("count users: %w", err)
	}
	if count > 0 {
		slog.Info("database already has users, nothing to seed")
		return nil
	}

	userSvc := users.NewService(users.NewRepository(pool))
	ownerUser, err := userSvc.Create(ctx, users.NewUser{Email: owner.email, Name: owner.name, Role: owner.role, Password: owner.password})
	if err != nil {
		return fmt.Errorf("create owner: %w", err)
	}
	ctx = actor.With(ctx, actor.Actor{UserID: ownerUser.ID, Email: ownerUser.Email, Name: ownerUser.Name, Role: actor.RoleOwner})

	if staff.email != "" && staff.password != "" {
		if _, err := userSvc.Create(ctx, users.NewUser{Email: staff.email, Name: staff.name, Role: staff.role, Password: staff.password}); err != nil {
			return fmt.Errorf("create staff: %w", err)
		}
	}

	if os.Getenv("SEED_SAMPLE_DATA") == "false" {
		slog.Info("seed complete without sample data", slog.String("owner", owner.email))
		return nil
	}
	if err := seedStock(ctx, pool); err != nil {
		return err
	}
	slog.Info("seed complete", slog.String("owner", owner.email), slog.String("staff", staff.email))
	return nil
}

func seedStock(ctx context.Context, pool *pgxpool.Pool) error {
	productSvc := products.NewService(products.NewRepository(pool))
	stockSvc := stock.NewService(stock.NewRepository(pool))
	orderSvc := orders.NewService(orders.NewRepository(pool))

	catalog := []sampleProduct{
		{"SKU-0001", "เสื้อยืดคอกลม สีขาว M", "290.00", 5, 24},
		{"SKU-0002", "กางเกงยีนส์ขายาว 32", "600.00", 5, 8},
		{"SKU-0003", "หมวกแก๊ป สีดำ", "250.00", 3, 4},
		{"SKU-0004", "กระเป๋าผ้า canvas", "350.00", 10, 60},
	}
	ids := make(map[string]int64, len(catalog))
	for _, p := range catalog {
		d, err := productSvc.Create(ctx, products.Input{
			SKU: p.sku, Name: p.name, Price: p.price, LowStockThreshold: p.threshold, IsActive: true,
		})
		if err != nil {
			return fmt.Errorf("create product %s: %w", p.sku, err)
		}
		ids[p.sku] = d.ID
		if _, err := stockSvc.StockIn(ctx, stock.ReceiptInput{ProductID: d.ID, Qty: p.qty, Note: "ของล็อตแรก"}); err != nil {
			return fmt.Errorf("stock in %s: %w", p.sku, err)
		}
	}

	samples := []sampleOrder{
		{orders.ChannelShopee, "SHP-2409-0101", map[string]int32{"SKU-0001": 1, "SKU-0002": 1}, false},
		{orders.ChannelLine, "", map[string]int32{"SKU-0001": 5, "SKU-0002": 4}, true},
		{orders.ChannelShopee, "SHP-2409-0102", map[string]int32{"SKU-0003": 2}, false},
		{orders.ChannelLine, "", map[string]int32{"SKU-0003": 2, "SKU-0004": 2}, false},
		{orders.ChannelShopee, "SHP-2409-0103", map[string]int32{"SKU-0003": 1}, false},
	}
	for _, s := range samples {
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

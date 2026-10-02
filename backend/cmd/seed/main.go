// Command seed creates the first owner (and optionally a staff account and sample stock) on an empty database.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
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

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}
	if cfg.AppEnv == config.EnvProduction && os.Getenv("SEED_SAMPLE_DATA") != "false" {
		return errors.New("refusing to add sample data to production; set SEED_SAMPLE_DATA=false")
	}

	owner := account{os.Getenv("SEED_OWNER_EMAIL"), os.Getenv("SEED_OWNER_PASSWORD"), sampleOwnerName, actor.RoleOwner}
	staff := account{os.Getenv("SEED_STAFF_EMAIL"), os.Getenv("SEED_STAFF_PASSWORD"), sampleStaffName, actor.RoleStaff}
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
	if err := seedSampleShop(ctx, pool); err != nil {
		return err
	}
	slog.Info("seed complete", slog.String("owner", owner.email), slog.String("staff", staff.email))
	return nil
}

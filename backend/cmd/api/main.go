package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/counts"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/health"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/line"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/logger"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/users"
)

const (
	startupTimeout    = 15 * time.Second
	shutdownTimeout   = 15 * time.Second
	readHeaderTimeout = 10 * time.Second
)

func main() {
	if err := run(); err != nil {
		slog.Error("api exited with error", slog.String("error", err.Error()))
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("load config: %w", err)
	}

	log := logger.New(cfg.AppEnv)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	startupCtx, cancelStartup := context.WithTimeout(ctx, startupTimeout)
	defer cancelStartup()

	pool, err := database.NewPool(startupCtx, cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("connect database: %w", err)
	}
	defer pool.Close()

	log.Info("database pool ready")

	authService := auth.NewService(auth.NewRepository(pool))
	demoAccounts := make([]auth.DemoAccount, 0, len(cfg.DemoAccounts))
	for _, a := range cfg.DemoAccounts {
		demoAccounts = append(demoAccounts, auth.DemoAccount(a))
	}
	authHandler := auth.NewHandler(authService, cfg.CookieSecure).WithDemoAccounts(demoAccounts)

	productService := products.NewService(products.NewRepository(pool))
	verifier, messenger := lineChannels(cfg.Line, log)
	orderService := orders.NewService(orders.NewRepository(pool)).WithNotifier(line.NewNotifier(messenger, log))
	lineService := line.NewService(line.Settings{Mode: cfg.Line.Mode, LIFFID: cfg.Line.LIFFID}, verifier, orderService, productService)

	server := &http.Server{
		Addr: cfg.Addr(),
		Handler: httpx.NewRouter(httpx.RouterConfig{
			Logger:  log,
			GinMode: cfg.GinMode,
			Routes: []httpx.Route{
				health.NewHandler(pool),
				authHandler,
				line.NewHandler(lineService),
			},
			Protected: []httpx.Route{
				authHandler.Protected(),
				users.NewHandler(users.NewService(users.NewRepository(pool))),
				products.NewHandler(productService),
				stock.NewHandler(stock.NewService(stock.NewRepository(pool))),
				orders.NewHandler(orderService),
				counts.NewHandler(counts.NewService(counts.NewRepository(pool))),
				audit.NewHandler(audit.NewService(audit.NewRepository(pool))),
			},
			Sessions:  authService,
			StaticDir: cfg.StaticDir,
		}),
		ReadHeaderTimeout: readHeaderTimeout,
	}

	serverErr := make(chan error, 1)
	go func() {
		log.Info("http server listening", slog.String("addr", server.Addr))
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- fmt.Errorf("http server: %w", err)
			return
		}
		serverErr <- nil
	}()

	select {
	case err := <-serverErr:
		return err
	case <-ctx.Done():
		log.Info("shutdown signal received")
	}

	// Not ctx: it is already canceled by the time shutdown starts.
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancelShutdown()

	if err := server.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}

	log.Info("shutdown complete")

	return nil
}

// lineChannels picks the real LINE APIs in live mode and log-only fakes otherwise.
func lineChannels(cfg config.LineConfig, log *slog.Logger) (line.Verifier, line.Messenger) {
	if cfg.Mode == config.LineModeLive {
		client := line.NewClient(cfg.LoginChannelID, cfg.AccessToken)
		return client, client
	}
	return line.DevVerifier{}, line.LogMessenger{Logger: log}
}

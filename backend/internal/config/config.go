package config

import (
	"fmt"
	"os"
	"strconv"
)

const (
	EnvDevelopment = "development"
	EnvProduction  = "production"
	EnvTest        = "test"

	GinModeDebug   = "debug"
	GinModeRelease = "release"
	GinModeTest    = "test"
)

const (
	defaultHTTPPort = "8080"
	minPort         = 1
	maxPort         = 65535
)

type Config struct {
	DatabaseURL string
	HTTPPort    int
	AppEnv      string
	GinMode     string
}

func Load() (Config, error) {
	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		AppEnv:      envOrDefault("APP_ENV", EnvDevelopment),
		GinMode:     envOrDefault("GIN_MODE", GinModeDebug),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("config: DATABASE_URL is required")
	}

	port, err := parsePort(envOrDefault("HTTP_PORT", defaultHTTPPort))
	if err != nil {
		return Config{}, err
	}
	cfg.HTTPPort = port

	switch cfg.AppEnv {
	case EnvDevelopment, EnvProduction, EnvTest:
	default:
		return Config{}, fmt.Errorf("config: APP_ENV %q must be one of development, production, test", cfg.AppEnv)
	}

	// An unknown mode makes gin.SetMode panic, so it is rejected here instead.
	switch cfg.GinMode {
	case GinModeDebug, GinModeRelease, GinModeTest:
	default:
		return Config{}, fmt.Errorf("config: GIN_MODE %q must be one of debug, release, test", cfg.GinMode)
	}

	return cfg, nil
}

func (c Config) Addr() string {
	return fmt.Sprintf(":%d", c.HTTPPort)
}

func (c Config) IsDevelopment() bool {
	return c.AppEnv == EnvDevelopment
}

func parsePort(raw string) (int, error) {
	port, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("config: parse HTTP_PORT %q: %w", raw, err)
	}
	if port < minPort || port > maxPort {
		return 0, fmt.Errorf("config: HTTP_PORT %d outside range %d-%d", port, minPort, maxPort)
	}
	return port, nil
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// Package config loads process configuration from environment variables.
//
// Configuration comes from the environment only. There is no config file and
// no secret is ever read from disk, which keeps the twelve-factor contract the
// docker-compose and CI setups rely on.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Valid values for APP_ENV and GIN_MODE.
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

// Config holds every setting the api process needs.
type Config struct {
	DatabaseURL  string
	HTTPPort     int
	AppEnv       string
	GinMode      string
	StaticDir    string
	CookieSecure bool
}

// Load reads and validates configuration from the environment. DATABASE_URL is
// required; the remaining settings fall back to development defaults.
func Load() (Config, error) {
	cfg := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		AppEnv:      envOrDefault("APP_ENV", EnvDevelopment),
		GinMode:     envOrDefault("GIN_MODE", GinModeDebug),
		StaticDir:   os.Getenv("STATIC_DIR"),
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

	switch raw := os.Getenv("COOKIE_SECURE"); raw {
	case "":
		cfg.CookieSecure = cfg.AppEnv == EnvProduction
	case "true", "false":
		cfg.CookieSecure = raw == "true"
	default:
		return Config{}, fmt.Errorf("config: COOKIE_SECURE %q must be true or false", raw)
	}

	return cfg, nil
}

// Addr returns the listen address for the http server.
func (c Config) Addr() string {
	return fmt.Sprintf(":%d", c.HTTPPort)
}

// IsDevelopment reports whether the process runs in the development environment.
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

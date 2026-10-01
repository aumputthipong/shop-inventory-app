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

// Valid values for LINE_MODE. dev fakes LINE sign-in and logs messages instead
// of sending them, so the LINE order form works without a LINE account.
const (
	LineModeOff  = "off"
	LineModeDev  = "dev"
	LineModeLive = "live"
)

const (
	defaultHTTPPort = "8080"
	minPort         = 1
	maxPort         = 65535
)

type Config struct {
	DatabaseURL  string
	HTTPPort     int
	AppEnv       string
	GinMode      string
	StaticDir    string
	CookieSecure bool
	Line         LineConfig
}

// LineConfig holds the LINE channels behind the customer order form.
type LineConfig struct {
	Mode           string
	LoginChannelID string
	LIFFID         string
	AccessToken    string
}

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

	line, err := loadLine(cfg.AppEnv)
	if err != nil {
		return Config{}, err
	}
	cfg.Line = line

	return cfg, nil
}

func loadLine(appEnv string) (LineConfig, error) {
	fallback := LineModeOff
	if appEnv == EnvDevelopment {
		fallback = LineModeDev
	}
	line := LineConfig{
		Mode:           envOrDefault("LINE_MODE", fallback),
		LoginChannelID: os.Getenv("LINE_LOGIN_CHANNEL_ID"),
		LIFFID:         os.Getenv("LINE_LIFF_ID"),
		AccessToken:    os.Getenv("LINE_CHANNEL_ACCESS_TOKEN"),
	}

	switch line.Mode {
	case LineModeOff:
	case LineModeDev:
		if appEnv == EnvProduction {
			return LineConfig{}, fmt.Errorf("config: LINE_MODE dev fakes sign-in and is not allowed in production")
		}
	case LineModeLive:
		if line.LoginChannelID == "" || line.LIFFID == "" || line.AccessToken == "" {
			return LineConfig{}, fmt.Errorf("config: LINE_MODE live needs LINE_LOGIN_CHANNEL_ID, LINE_LIFF_ID and LINE_CHANNEL_ACCESS_TOKEN")
		}
	default:
		return LineConfig{}, fmt.Errorf("config: LINE_MODE %q must be one of off, dev, live", line.Mode)
	}
	return line, nil
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

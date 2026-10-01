package config_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
)

const testDSN = "postgres://user:pass@localhost:5432/db?sslmode=disable"

func TestLoad(t *testing.T) {
	tests := []struct {
		name    string
		env     map[string]string
		want    config.Config
		wantErr string
	}{
		{
			name: "defaults applied when only database url is set",
			env:  map[string]string{"DATABASE_URL": testDSN},
			want: config.Config{
				DatabaseURL: testDSN,
				HTTPPort:    8080,
				AppEnv:      config.EnvDevelopment,
				GinMode:     config.GinModeDebug,
				Line:        config.LineConfig{Mode: config.LineModeDev},
			},
		},
		{
			name: "every value read from the environment",
			env: map[string]string{
				"DATABASE_URL": testDSN,
				"HTTP_PORT":    "9090",
				"APP_ENV":      config.EnvProduction,
				"GIN_MODE":     config.GinModeRelease,
				"STATIC_DIR":   "/app/web",
			},
			want: config.Config{
				DatabaseURL:  testDSN,
				HTTPPort:     9090,
				AppEnv:       config.EnvProduction,
				GinMode:      config.GinModeRelease,
				StaticDir:    "/app/web",
				CookieSecure: true,
				Line:         config.LineConfig{Mode: config.LineModeOff},
			},
		},
		{
			name: "secure cookies can be turned off for plain http",
			env:  map[string]string{"DATABASE_URL": testDSN, "APP_ENV": config.EnvProduction, "COOKIE_SECURE": "false"},
			want: config.Config{
				DatabaseURL: testDSN,
				HTTPPort:    8080,
				AppEnv:      config.EnvProduction,
				GinMode:     config.GinModeDebug,
				Line:        config.LineConfig{Mode: config.LineModeOff},
			},
		},
		{
			name: "live LINE reads every channel setting",
			env: map[string]string{
				"DATABASE_URL": testDSN, "LINE_MODE": config.LineModeLive, "LINE_LOGIN_CHANNEL_ID": "1650000000",
				"LINE_LIFF_ID": "1650000000-abcd", "LINE_CHANNEL_ACCESS_TOKEN": "token",
			},
			want: config.Config{
				DatabaseURL: testDSN,
				HTTPPort:    8080,
				AppEnv:      config.EnvDevelopment,
				GinMode:     config.GinModeDebug,
				Line: config.LineConfig{
					Mode: config.LineModeLive, LoginChannelID: "1650000000", LIFFID: "1650000000-abcd", AccessToken: "token",
				},
			},
		},
		{
			name:    "live LINE needs its channels",
			env:     map[string]string{"DATABASE_URL": testDSN, "LINE_MODE": config.LineModeLive},
			wantErr: "LINE_MODE live needs",
		},
		{
			name:    "fake LINE sign-in is refused in production",
			env:     map[string]string{"DATABASE_URL": testDSN, "APP_ENV": config.EnvProduction, "LINE_MODE": config.LineModeDev},
			wantErr: "not allowed in production",
		},
		{
			name:    "unknown LINE mode is rejected",
			env:     map[string]string{"DATABASE_URL": testDSN, "LINE_MODE": "maybe"},
			wantErr: `LINE_MODE "maybe"`,
		},
		{
			name:    "cookie secure must be a boolean",
			env:     map[string]string{"DATABASE_URL": testDSN, "COOKIE_SECURE": "yes"},
			wantErr: `COOKIE_SECURE "yes"`,
		},
		{
			name:    "database url is required",
			env:     map[string]string{},
			wantErr: "DATABASE_URL is required",
		},
		{
			name:    "non numeric port is rejected",
			env:     map[string]string{"DATABASE_URL": testDSN, "HTTP_PORT": "http"},
			wantErr: `parse HTTP_PORT "http"`,
		},
		{
			name:    "out of range port is rejected",
			env:     map[string]string{"DATABASE_URL": testDSN, "HTTP_PORT": "70000"},
			wantErr: "outside range 1-65535",
		},
		{
			name:    "unknown app env is rejected",
			env:     map[string]string{"DATABASE_URL": testDSN, "APP_ENV": "staging"},
			wantErr: `APP_ENV "staging"`,
		},
		{
			name:    "unknown gin mode is rejected",
			env:     map[string]string{"DATABASE_URL": testDSN, "GIN_MODE": "verbose"},
			wantErr: `GIN_MODE "verbose"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range []string{"DATABASE_URL", "HTTP_PORT", "APP_ENV", "GIN_MODE", "STATIC_DIR", "COOKIE_SECURE",
				"LINE_MODE", "LINE_LOGIN_CHANNEL_ID", "LINE_LIFF_ID", "LINE_CHANNEL_ACCESS_TOKEN"} {
				t.Setenv(key, "")
			}
			for key, value := range tt.env {
				t.Setenv(key, value)
			}

			got, err := config.Load()

			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestConfigAddr(t *testing.T) {
	cfg := config.Config{HTTPPort: 8080}
	assert.Equal(t, ":8080", cfg.Addr())
}

func TestConfigIsDevelopment(t *testing.T) {
	assert.True(t, config.Config{AppEnv: config.EnvDevelopment}.IsDevelopment())
	assert.False(t, config.Config{AppEnv: config.EnvProduction}.IsDevelopment())
}

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
			},
		},
		{
			name: "every value read from the environment",
			env: map[string]string{
				"DATABASE_URL": testDSN,
				"HTTP_PORT":    "9090",
				"APP_ENV":      config.EnvProduction,
				"GIN_MODE":     config.GinModeRelease,
			},
			want: config.Config{
				DatabaseURL: testDSN,
				HTTPPort:    9090,
				AppEnv:      config.EnvProduction,
				GinMode:     config.GinModeRelease,
			},
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
			// t.Setenv also clears the variable again once the subtest ends.
			for _, key := range []string{"DATABASE_URL", "HTTP_PORT", "APP_ENV", "GIN_MODE"} {
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

// Package logger builds the structured logger used across the application.
package logger

import (
	"log/slog"
	"os"
)

// New returns a JSON slog logger writing to stdout. The development
// environment logs at debug level; every other environment logs at info.
func New(appEnv string) *slog.Logger {
	level := slog.LevelInfo
	if appEnv == "development" {
		level = slog.LevelDebug
	}

	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: level,
	})

	return slog.New(handler).With(slog.String("env", appEnv))
}

package line

import (
	"context"
	"log/slog"
	"strings"
	"unicode/utf8"
)

const devTokenPrefix = "dev:"

// DevVerifier accepts "dev:<name>" as a sign-in so the order form can be tried
// without a LINE account. Config refuses LINE_MODE=dev in production.
type DevVerifier struct{}

func (DevVerifier) Verify(_ context.Context, idToken string) (Identity, error) {
	name, ok := strings.CutPrefix(idToken, devTokenPrefix)
	name = strings.TrimSpace(name)
	if !ok || name == "" || utf8.RuneCountInString(name) > 40 {
		return Identity{}, ErrInvalidToken
	}
	return Identity{UserID: "dev-" + name, Name: name}, nil
}

// LogMessenger writes messages to the log instead of sending them.
type LogMessenger struct {
	Logger *slog.Logger
}

func (m LogMessenger) Push(ctx context.Context, to, text string) error {
	m.Logger.InfoContext(ctx, "line message not sent in dev mode", slog.String("to", to), slog.String("text", text))
	return nil
}

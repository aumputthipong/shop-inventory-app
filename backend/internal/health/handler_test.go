package health_test

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/config"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/health"
	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
)

// stubPinger stands in for the pgx pool so this test needs no database.
type stubPinger struct {
	err    error
	called bool
}

func (s *stubPinger) Ping(ctx context.Context) error {
	s.called = true

	// The handler must hand down a live context with a deadline, never a
	// canceled one and never *gin.Context.
	if _, ok := ctx.Deadline(); !ok {
		return errors.New("expected the handler to apply a ping deadline")
	}

	return s.err
}

func newTestServer(t *testing.T, pinger health.Pinger) http.Handler {
	t.Helper()

	return httpx.NewRouter(httpx.RouterConfig{
		Logger:  slog.New(slog.DiscardHandler),
		GinMode: config.GinModeTest,
		Routes:  []httpx.Route{health.NewHandler(pinger)},
	})
}

func TestHealthz(t *testing.T) {
	tests := []struct {
		name       string
		pingErr    error
		wantStatus int
		wantBody   health.Response
	}{
		{
			name:       "reachable database reports ok",
			pingErr:    nil,
			wantStatus: http.StatusOK,
			wantBody:   health.Response{Status: health.StatusOK, DB: health.StatusOK},
		},
		{
			name:       "unreachable database reports degraded",
			pingErr:    errors.New("connection refused"),
			wantStatus: http.StatusServiceUnavailable,
			wantBody:   health.Response{Status: health.StatusDegraded, DB: health.StatusError},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			pinger := &stubPinger{err: tt.pingErr}
			recorder := httptest.NewRecorder()
			request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/healthz", nil)

			newTestServer(t, pinger).ServeHTTP(recorder, request)

			assert.True(t, pinger.called, "the handler must ping the database")
			assert.Equal(t, tt.wantStatus, recorder.Code)

			var got health.Response
			require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &got))
			assert.Equal(t, tt.wantBody, got)
		})
	}
}

// The request id middleware must reach the health route, since the whole
// router is what gets mounted in production.
func TestHealthzEchoesRequestID(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/healthz", nil)
	request.Header.Set(httpx.RequestIDHeader, "test-request-id")

	newTestServer(t, &stubPinger{}).ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, "test-request-id", recorder.Header().Get(httpx.RequestIDHeader))
}

func TestUnknownRouteReturnsSharedErrorEnvelope(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/does-not-exist", nil)

	newTestServer(t, &stubPinger{}).ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusNotFound, recorder.Code)

	var got httpx.ErrorResponse
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &got))
	assert.Equal(t, httpx.CodeNotFound, got.Error.Code)
	assert.NotEmpty(t, got.Error.RequestID, "errors must carry the request id")
}

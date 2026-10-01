package line_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/line"
)

func TestClientVerify(t *testing.T) {
	tests := []struct {
		name     string
		status   int
		body     string
		want     line.Identity
		wantErr  error
		anyError bool
	}{
		{"genuine token", http.StatusOK, `{"sub":"U123","name":"Ploy"}`, line.Identity{UserID: "U123", Name: "Ploy"}, nil, false},
		{"expired or foreign token", http.StatusBadRequest, `{"error":"invalid_request"}`, line.Identity{}, line.ErrInvalidToken, false},
		{"answer without a user", http.StatusOK, `{}`, line.Identity{}, line.ErrInvalidToken, false},
		{"LINE is down", http.StatusServiceUnavailable, `busy`, line.Identity{}, nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var form url.Values
			srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				assert.Equal(t, "/oauth2/v2.1/verify", r.URL.Path)
				raw, _ := io.ReadAll(r.Body)
				form, _ = url.ParseQuery(string(raw))
				w.WriteHeader(tt.status)
				_, _ = w.Write([]byte(tt.body))
			}))
			t.Cleanup(srv.Close)

			got, err := line.NewClient("1650000000", "token").WithBaseURL(srv.URL).Verify(t.Context(), "id-token")

			assert.Equal(t, "id-token", form.Get("id_token"))
			assert.Equal(t, "1650000000", form.Get("client_id"), "LINE checks the token was issued for our channel")
			switch {
			case tt.wantErr != nil:
				require.ErrorIs(t, err, tt.wantErr)
			case tt.anyError:
				require.Error(t, err)
				assert.NotErrorIs(t, err, line.ErrInvalidToken)
			default:
				require.NoError(t, err)
				assert.Equal(t, tt.want, got)
			}
		})
	}
}

func TestClientPush(t *testing.T) {
	var auth string
	var body struct {
		To       string `json:"to"`
		Messages []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"messages"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v2/bot/message/push", r.URL.Path)
		auth = r.Header.Get("Authorization")
		_ = json.NewDecoder(r.Body).Decode(&body)
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(srv.Close)

	err := line.NewClient("1650000000", "secret-token").WithBaseURL(srv.URL).Push(t.Context(), "U123", "สวัสดี")

	require.NoError(t, err)
	assert.Equal(t, "Bearer secret-token", auth)
	assert.Equal(t, "U123", body.To)
	require.Len(t, body.Messages, 1)
	assert.Equal(t, "สวัสดี", body.Messages[0].Text)
}

func TestClientPushReportsRejection(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		_, _ = w.Write([]byte(`{"message":"The user hasn't added the LINE Official Account as a friend."}`))
	}))
	t.Cleanup(srv.Close)

	err := line.NewClient("1", "t").WithBaseURL(srv.URL).Push(t.Context(), "U123", "hi")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "status 400")
}

func TestDevVerifier(t *testing.T) {
	got, err := line.DevVerifier{}.Verify(t.Context(), "dev:สมชาย")
	require.NoError(t, err)
	assert.Equal(t, line.Identity{UserID: "dev-สมชาย", Name: "สมชาย"}, got)

	for _, token := range []string{"", "dev:", "eyJhbGciOi", "dev:   "} {
		_, err := line.DevVerifier{}.Verify(t.Context(), token)
		require.ErrorIs(t, err, line.ErrInvalidToken, token)
	}
}

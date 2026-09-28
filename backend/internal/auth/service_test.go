package auth_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

type memoryRepo struct {
	creds    auth.Credentials
	sessions map[string]int64
}

func (m *memoryRepo) FindByEmail(_ context.Context, email string) (auth.Credentials, error) {
	if email != m.creds.User.Email {
		return auth.Credentials{}, auth.ErrUserNotFound
	}
	return m.creds, nil
}

func (m *memoryRepo) CreateSession(_ context.Context, hash []byte, userID int64, _ time.Time) error {
	m.sessions[string(hash)] = userID
	return nil
}

func (m *memoryRepo) SessionUser(_ context.Context, hash []byte) (auth.User, error) {
	if _, ok := m.sessions[string(hash)]; !ok {
		return auth.User{}, auth.ErrUserNotFound
	}
	return m.creds.User, nil
}

func (m *memoryRepo) DeleteSession(_ context.Context, hash []byte) error {
	delete(m.sessions, string(hash))
	return nil
}

func newRepo(t *testing.T) *memoryRepo {
	t.Helper()
	hash, err := auth.HashPassword("owner-pass-123")
	require.NoError(t, err)
	return &memoryRepo{
		creds: auth.Credentials{
			User:         auth.User{ID: 1, Email: "owner@shop.local", Name: "owner", Role: actor.RoleOwner},
			PasswordHash: hash,
		},
		sessions: map[string]int64{},
	}
}

func TestLogin(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		password string
		wantErr  error
	}{
		{"correct password", "owner@shop.local", "owner-pass-123", nil},
		{"surrounding spaces in email", "  owner@shop.local ", "owner-pass-123", nil},
		{"wrong password", "owner@shop.local", "nope", auth.ErrInvalidCredentials},
		{"unknown email looks the same", "nobody@shop.local", "owner-pass-123", auth.ErrInvalidCredentials},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newRepo(t)
			session, err := auth.NewService(repo).Login(t.Context(), tt.email, tt.password)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.Empty(t, repo.sessions)
				return
			}
			require.NoError(t, err)
			assert.NotEmpty(t, session.Token)
			assert.Len(t, repo.sessions, 1)
			for stored := range repo.sessions {
				assert.NotEqual(t, session.Token, stored, "only the token hash is stored")
			}
		})
	}
}

func TestSessionLifecycle(t *testing.T) {
	repo := newRepo(t)
	svc := auth.NewService(repo)

	session, err := svc.Login(t.Context(), "owner@shop.local", "owner-pass-123")
	require.NoError(t, err)

	a, err := svc.ResolveSession(t.Context(), session.Token)
	require.NoError(t, err)
	assert.Equal(t, actor.RoleOwner, a.Role)

	require.NoError(t, svc.Logout(t.Context(), session.Token))
	_, err = svc.ResolveSession(t.Context(), session.Token)
	require.ErrorIs(t, err, actor.ErrNoSession)
}

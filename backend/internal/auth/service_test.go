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

func (m *memoryRepo) PasswordHash(context.Context, int64) (string, error) {
	return m.creds.PasswordHash, nil
}

func (m *memoryRepo) ChangePassword(_ context.Context, userID int64, hash string, keep []byte) error {
	m.creds.PasswordHash = hash
	for k, id := range m.sessions {
		if id == userID && k != string(keep) {
			delete(m.sessions, k)
		}
	}
	return nil
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
			Active:       true,
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

func TestDisabledAccountCannotSignIn(t *testing.T) {
	repo := newRepo(t)
	repo.creds.Active = false

	_, err := auth.NewService(repo).Login(t.Context(), "owner@shop.local", "owner-pass-123")

	require.ErrorIs(t, err, auth.ErrAccountDisabled)
	assert.Empty(t, repo.sessions)
}

func TestChangePasswordKeepsOnlyTheCurrentSession(t *testing.T) {
	repo := newRepo(t)
	svc := auth.NewService(repo)
	laptop, err := svc.Login(t.Context(), "owner@shop.local", "owner-pass-123")
	require.NoError(t, err)
	phone, err := svc.Login(t.Context(), "owner@shop.local", "owner-pass-123")
	require.NoError(t, err)
	ctx := actor.With(t.Context(), actor.Actor{UserID: 1, Role: actor.RoleOwner})

	require.ErrorIs(t, svc.ChangePassword(ctx, laptop.Token, "nope", "brand-new-pass"), auth.ErrWrongPassword)
	require.ErrorIs(t, svc.ChangePassword(ctx, laptop.Token, "owner-pass-123", "short"), auth.ErrWeakPassword)
	require.NoError(t, svc.ChangePassword(ctx, laptop.Token, "owner-pass-123", "brand-new-pass"))

	_, err = svc.ResolveSession(t.Context(), laptop.Token)
	require.NoError(t, err)
	_, err = svc.ResolveSession(t.Context(), phone.Token)
	require.ErrorIs(t, err, actor.ErrNoSession)

	_, err = svc.Login(t.Context(), "owner@shop.local", "brand-new-pass")
	require.NoError(t, err)
}

func TestRepeatedWrongPasswordsLockTheEmailForAWhile(t *testing.T) {
	repo := newRepo(t)
	svc := auth.NewService(repo)

	for range 5 {
		_, err := svc.Login(t.Context(), "owner@shop.local", "wrong")
		require.ErrorIs(t, err, auth.ErrInvalidCredentials)
	}

	_, err := svc.Login(t.Context(), "OWNER@shop.local", "owner-pass-123")
	require.ErrorIs(t, err, auth.ErrTooManyAttempts, "even the right password waits out the lock")
}

func TestSuccessfulSignInClearsFailures(t *testing.T) {
	repo := newRepo(t)
	svc := auth.NewService(repo)

	for range 4 {
		_, _ = svc.Login(t.Context(), "owner@shop.local", "wrong")
	}
	_, err := svc.Login(t.Context(), "owner@shop.local", "owner-pass-123")
	require.NoError(t, err)

	for range 4 {
		_, _ = svc.Login(t.Context(), "owner@shop.local", "wrong")
	}
	_, err = svc.Login(t.Context(), "owner@shop.local", "owner-pass-123")
	require.NoError(t, err)
}

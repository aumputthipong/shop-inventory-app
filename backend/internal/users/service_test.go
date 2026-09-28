package users_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/users"
)

type fakeRepo struct {
	users.Repository
	users       map[int64]users.User
	otherOwners int64
	passwordSet bool
}

func (f *fakeRepo) Get(_ context.Context, id int64) (users.User, error) {
	u, ok := f.users[id]
	if !ok {
		return users.User{}, users.ErrNotFound
	}
	return u, nil
}

func (f *fakeRepo) CountOtherActiveOwners(context.Context, int64) (int64, error) {
	return f.otherOwners, nil
}

func (f *fakeRepo) SetActive(_ context.Context, id int64, active bool) error {
	u := f.users[id]
	u.Active = active
	f.users[id] = u
	return nil
}

func (f *fakeRepo) SetPassword(context.Context, int64, string) error {
	f.passwordSet = true
	return nil
}

func signedIn(t *testing.T) context.Context {
	t.Helper()
	return actor.With(t.Context(), actor.Actor{UserID: 1, Role: actor.RoleOwner})
}

func repo(otherOwners int64) *fakeRepo {
	return &fakeRepo{
		otherOwners: otherOwners,
		users: map[int64]users.User{
			1: {ID: 1, Role: actor.RoleOwner, Active: true},
			2: {ID: 2, Role: actor.RoleStaff, Active: true},
			3: {ID: 3, Role: actor.RoleOwner, Active: true},
		},
	}
}

func TestSetActive(t *testing.T) {
	tests := []struct {
		name        string
		id          int64
		active      bool
		otherOwners int64
		wantErr     error
	}{
		{"disable staff", 2, false, 1, nil},
		{"disable another owner while one stays", 3, false, 1, nil},
		{"cannot disable the last active owner", 3, false, 0, users.ErrLastOwner},
		{"cannot disable yourself", 1, false, 5, users.ErrSelf},
		{"unknown user", 9, false, 1, users.ErrNotFound},
		{"enable again", 2, true, 0, nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := repo(tt.otherOwners)
			u, err := users.NewService(r).SetActive(signedIn(t), tt.id, tt.active)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.active, u.Active)
			assert.Equal(t, tt.active, r.users[tt.id].Active)
		})
	}
}

func TestResetPassword(t *testing.T) {
	tests := []struct {
		name     string
		id       int64
		password string
		wantErr  error
	}{
		{"staff forgot their password", 2, "new-pass-123", nil},
		{"too short", 2, "short", auth.ErrWeakPassword},
		{"not for your own account", 1, "new-pass-123", users.ErrSelf},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := repo(1)
			err := users.NewService(r).ResetPassword(signedIn(t), tt.id, tt.password)
			if tt.wantErr != nil {
				require.ErrorIs(t, err, tt.wantErr)
				assert.False(t, r.passwordSet)
				return
			}
			require.NoError(t, err)
			assert.True(t, r.passwordSet)
		})
	}
}

// Package httpxtest holds fakes for testing handlers through httpx.NewRouter.
package httpxtest

import (
	"context"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

// RoleSessions signs in user 1 with the role written in the session cookie, such as "owner" or "staff".
type RoleSessions struct{}

func (RoleSessions) ResolveSession(_ context.Context, token string) (actor.Actor, error) {
	role := actor.Role(token)
	if !role.Valid() {
		return actor.Actor{}, actor.ErrNoSession
	}
	return actor.Actor{UserID: 1, Name: string(role), Role: role}, nil
}

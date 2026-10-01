// Package actor carries the signed-in user on a context.Context so services
// can authorize and attribute work without seeing the http layer.
package actor

import (
	"context"
	"errors"
)

var ErrNoSession = errors.New("no valid session")

type Role string

const (
	RoleOwner Role = "owner"
	RoleStaff Role = "staff"
)

func (r Role) Valid() bool {
	return r == RoleOwner || r == RoleStaff
}

type Actor struct {
	UserID int64
	Email  string
	Name   string
	Role   Role
}

type key struct{}

func With(ctx context.Context, a Actor) context.Context {
	return context.WithValue(ctx, key{}, a)
}

func From(ctx context.Context) (Actor, bool) {
	a, ok := ctx.Value(key{}).(Actor)
	return a, ok
}

// IDFrom returns nil when no actor is attached, which the database stores as NULL.
func IDFrom(ctx context.Context) *int64 {
	a, ok := From(ctx)
	if !ok {
		return nil
	}
	id := a.UserID
	return &id
}

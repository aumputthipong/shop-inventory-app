// Package users manages the shop's team accounts.
package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

const MinPasswordLength = 8

var (
	ErrEmailTaken   = errors.New("email already in use")
	ErrWeakPassword = errors.New("password too short")
)

type User struct {
	ID        int64
	Email     string
	Name      string
	Role      actor.Role
	CreatedAt time.Time
}

type NewUser struct {
	Email    string
	Name     string
	Role     actor.Role
	Password string
}

type Repository interface {
	List(ctx context.Context) ([]User, error)
	Create(ctx context.Context, u NewUser, passwordHash string) (User, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]User, error) {
	users, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	return users, nil
}

func (s *Service) Create(ctx context.Context, in NewUser) (User, error) {
	in.Email = strings.ToLower(strings.TrimSpace(in.Email))
	in.Name = strings.TrimSpace(in.Name)
	if utf8.RuneCountInString(in.Password) < MinPasswordLength {
		return User{}, ErrWeakPassword
	}
	if !in.Role.Valid() {
		return User{}, fmt.Errorf("create user: invalid role %q", in.Role)
	}

	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return User{}, err
	}

	u, err := s.repo.Create(ctx, in, hash)
	if err != nil {
		if errors.Is(err, ErrEmailTaken) {
			return User{}, err
		}
		return User{}, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

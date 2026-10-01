// Package users manages the shop's team accounts.
package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/auth"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

var (
	ErrEmailTaken = errors.New("email already in use")
	ErrNotFound   = errors.New("user not found")
	ErrSelf       = errors.New("use your own account menu for this")
	ErrLastOwner  = errors.New("the shop needs at least one active owner")
)

type User struct {
	ID        int64
	Email     string
	Name      string
	Role      actor.Role
	Active    bool
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
	Get(ctx context.Context, id int64) (User, error)
	Create(ctx context.Context, u NewUser, passwordHash string) (User, error)
	CountOtherActiveOwners(ctx context.Context, id int64) (int64, error)
	SetActive(ctx context.Context, id int64, active bool) error
	SetPassword(ctx context.Context, id int64, passwordHash string) error
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
	if err := auth.ValidatePassword(in.Password); err != nil {
		return User{}, err
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

// SetActive signs a disabled user out everywhere at once.
func (s *Service) SetActive(ctx context.Context, id int64, active bool) (User, error) {
	target, err := s.target(ctx, id)
	if err != nil {
		return User{}, err
	}
	if !active && target.Role == actor.RoleOwner && target.Active {
		others, err := s.repo.CountOtherActiveOwners(ctx, id)
		if err != nil {
			return User{}, fmt.Errorf("count owners: %w", err)
		}
		if others == 0 {
			return User{}, ErrLastOwner
		}
	}
	if target.Active != active {
		if err := s.repo.SetActive(ctx, id, active); err != nil {
			return User{}, fmt.Errorf("set active: %w", err)
		}
	}
	target.Active = active
	return target, nil
}

func (s *Service) ResetPassword(ctx context.Context, id int64, password string) error {
	if _, err := s.target(ctx, id); err != nil {
		return err
	}
	if err := auth.ValidatePassword(password); err != nil {
		return err
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		return err
	}
	if err := s.repo.SetPassword(ctx, id, hash); err != nil {
		return fmt.Errorf("reset password: %w", err)
	}
	return nil
}

func (s *Service) target(ctx context.Context, id int64) (User, error) {
	if a, ok := actor.From(ctx); ok && a.UserID == id {
		return User{}, ErrSelf
	}
	u, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return User{}, err
		}
		return User{}, fmt.Errorf("get user: %w", err)
	}
	return u, nil
}

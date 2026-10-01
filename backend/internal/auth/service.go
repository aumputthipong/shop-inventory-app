// Package auth signs users in and resolves their session cookie.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

const (
	SessionTTL        = 7 * 24 * time.Hour
	MinPasswordLength = 8
)

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
	ErrAccountDisabled    = errors.New("account is disabled")
	ErrWrongPassword      = errors.New("current password is wrong")
	ErrWeakPassword       = errors.New("password too short")
)

type User struct {
	ID    int64
	Email string
	Name  string
	Role  actor.Role
}

type Credentials struct {
	User         User
	PasswordHash string
	Active       bool
}

type Session struct {
	Token     string
	ExpiresAt time.Time
	User      User
}

type Repository interface {
	FindByEmail(ctx context.Context, email string) (Credentials, error)
	CreateSession(ctx context.Context, tokenHash []byte, userID int64, expiresAt time.Time) error
	SessionUser(ctx context.Context, tokenHash []byte) (User, error)
	DeleteSession(ctx context.Context, tokenHash []byte) error
	PasswordHash(ctx context.Context, userID int64) (string, error)
	ChangePassword(ctx context.Context, userID int64, passwordHash string, keepTokenHash []byte) error
}

type Service struct {
	repo      Repository
	now       func() time.Time
	dummyHash []byte
}

func NewService(repo Repository) *Service {
	dummy, _ := bcrypt.GenerateFromPassword([]byte("timing-equalizer"), bcrypt.DefaultCost)
	return &Service{repo: repo, now: time.Now, dummyHash: dummy}
}

func (s *Service) Login(ctx context.Context, email, password string) (Session, error) {
	creds, err := s.repo.FindByEmail(ctx, strings.TrimSpace(email))
	if errors.Is(err, ErrUserNotFound) {
		// Same bcrypt cost either way, so response time does not reveal which emails exist.
		_ = bcrypt.CompareHashAndPassword(s.dummyHash, []byte(password))
		return Session{}, ErrInvalidCredentials
	}
	if err != nil {
		return Session{}, fmt.Errorf("find user: %w", err)
	}

	if bcrypt.CompareHashAndPassword([]byte(creds.PasswordHash), []byte(password)) != nil {
		return Session{}, ErrInvalidCredentials
	}
	if !creds.Active {
		return Session{}, ErrAccountDisabled
	}

	token, err := newToken()
	if err != nil {
		return Session{}, err
	}
	expiresAt := s.now().Add(SessionTTL)
	if err := s.repo.CreateSession(ctx, hashToken(token), creds.User.ID, expiresAt); err != nil {
		return Session{}, fmt.Errorf("create session: %w", err)
	}

	return Session{Token: token, ExpiresAt: expiresAt, User: creds.User}, nil
}

func (s *Service) ResolveSession(ctx context.Context, token string) (actor.Actor, error) {
	u, err := s.repo.SessionUser(ctx, hashToken(token))
	if errors.Is(err, ErrUserNotFound) {
		return actor.Actor{}, actor.ErrNoSession
	}
	if err != nil {
		return actor.Actor{}, fmt.Errorf("resolve session: %w", err)
	}
	return actor.Actor{UserID: u.ID, Email: u.Email, Name: u.Name, Role: u.Role}, nil
}

func (s *Service) Logout(ctx context.Context, token string) error {
	if err := s.repo.DeleteSession(ctx, hashToken(token)); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// ChangePassword signs out the user's other sessions but keeps the one in use.
func (s *Service) ChangePassword(ctx context.Context, token, current, next string) error {
	a, ok := actor.From(ctx)
	if !ok {
		return actor.ErrNoSession
	}
	if err := ValidatePassword(next); err != nil {
		return err
	}

	hash, err := s.repo.PasswordHash(ctx, a.UserID)
	if err != nil {
		return fmt.Errorf("read password: %w", err)
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(current)) != nil {
		return ErrWrongPassword
	}

	nextHash, err := HashPassword(next)
	if err != nil {
		return err
	}
	if err := s.repo.ChangePassword(ctx, a.UserID, nextHash, hashToken(token)); err != nil {
		return fmt.Errorf("change password: %w", err)
	}
	return nil
}

func ValidatePassword(password string) error {
	if utf8.RuneCountInString(password) < MinPasswordLength {
		return ErrWeakPassword
	}
	return nil
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(hash), nil
}

func newToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate session token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

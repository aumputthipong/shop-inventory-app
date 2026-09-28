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

	"golang.org/x/crypto/bcrypt"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

const SessionTTL = 7 * 24 * time.Hour

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUserNotFound       = errors.New("user not found")
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

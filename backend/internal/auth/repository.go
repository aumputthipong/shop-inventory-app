package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

type PgRepository struct {
	q *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{q: sqlc.New(pool)}
}

func (r *PgRepository) FindByEmail(ctx context.Context, email string) (Credentials, error) {
	u, err := r.q.GetUserByEmail(ctx, email)
	if database.IsNotFound(err) {
		return Credentials{}, ErrUserNotFound
	}
	if err != nil {
		return Credentials{}, fmt.Errorf("get user by email: %w", err)
	}
	return Credentials{
		User:         User{ID: u.ID, Email: u.Email, Name: u.Name, Role: actor.Role(u.Role)},
		PasswordHash: u.PasswordHash,
	}, nil
}

func (r *PgRepository) CreateSession(ctx context.Context, tokenHash []byte, userID int64, expiresAt time.Time) error {
	err := r.q.CreateSession(ctx, sqlc.CreateSessionParams{TokenHash: tokenHash, UserID: userID, ExpiresAt: expiresAt})
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

func (r *PgRepository) SessionUser(ctx context.Context, tokenHash []byte) (User, error) {
	u, err := r.q.GetSessionUser(ctx, tokenHash)
	if database.IsNotFound(err) {
		return User{}, ErrUserNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("get session user: %w", err)
	}
	return User{ID: u.ID, Email: u.Email, Name: u.Name, Role: actor.Role(u.Role)}, nil
}

func (r *PgRepository) DeleteSession(ctx context.Context, tokenHash []byte) error {
	if err := r.q.DeleteSession(ctx, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

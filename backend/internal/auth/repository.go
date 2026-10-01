package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

type PgRepository struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool, q: sqlc.New(pool)}
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
		Active:       u.IsActive,
	}, nil
}

func (r *PgRepository) CreateSession(ctx context.Context, tokenHash []byte, userID int64, expiresAt time.Time) error {
	if err := r.q.DeleteExpiredSessions(ctx); err != nil {
		return fmt.Errorf("prune expired sessions: %w", err)
	}
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

func (r *PgRepository) PasswordHash(ctx context.Context, userID int64) (string, error) {
	hash, err := r.q.GetUserPasswordHash(ctx, userID)
	if database.IsNotFound(err) {
		return "", ErrUserNotFound
	}
	if err != nil {
		return "", fmt.Errorf("get password hash: %w", err)
	}
	return hash, nil
}

func (r *PgRepository) ChangePassword(ctx context.Context, userID int64, passwordHash string, keepTokenHash []byte) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		if err := q.SetUserPassword(ctx, sqlc.SetUserPasswordParams{ID: userID, PasswordHash: passwordHash}); err != nil {
			return fmt.Errorf("set password: %w", err)
		}
		err := q.DeleteOtherUserSessions(ctx, sqlc.DeleteOtherUserSessionsParams{UserID: userID, TokenHash: keepTokenHash})
		if err != nil {
			return fmt.Errorf("delete other sessions: %w", err)
		}
		return audit.Write(ctx, q, audit.Entry{
			Action: audit.ActionPasswordChange, EntityType: audit.EntityUser, EntityID: &userID,
		})
	})
}

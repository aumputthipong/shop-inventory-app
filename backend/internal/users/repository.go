package users

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/database"
)

type PgRepository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{pool: pool}
}

func (r *PgRepository) List(ctx context.Context) ([]User, error) {
	rows, err := sqlc.New(r.pool).ListUsers(ctx)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	users := make([]User, 0, len(rows))
	for _, row := range rows {
		users = append(users, User{
			ID: row.ID, Email: row.Email, Name: row.Name, Role: actor.Role(row.Role),
			Active: row.IsActive, CreatedAt: row.CreatedAt,
		})
	}
	return users, nil
}

func (r *PgRepository) Get(ctx context.Context, id int64) (User, error) {
	row, err := sqlc.New(r.pool).GetUser(ctx, id)
	if database.IsNotFound(err) {
		return User{}, ErrNotFound
	}
	if err != nil {
		return User{}, fmt.Errorf("query user: %w", err)
	}
	return User{
		ID: row.ID, Email: row.Email, Name: row.Name, Role: actor.Role(row.Role),
		Active: row.IsActive, CreatedAt: row.CreatedAt,
	}, nil
}

func (r *PgRepository) Create(ctx context.Context, in NewUser, passwordHash string) (User, error) {
	var created User
	err := database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		row, err := q.CreateUser(ctx, sqlc.CreateUserParams{
			Email: in.Email, PasswordHash: passwordHash, Name: in.Name, Role: string(in.Role),
		})
		if database.IsUniqueViolation(err, "users_email_key") {
			return ErrEmailTaken
		}
		if err != nil {
			return fmt.Errorf("insert user: %w", err)
		}
		created = User{
			ID: row.ID, Email: row.Email, Name: row.Name, Role: actor.Role(row.Role),
			Active: row.IsActive, CreatedAt: row.CreatedAt,
		}

		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionUserCreate,
			EntityType: audit.EntityUser,
			EntityID:   &row.ID,
			Detail:     map[string]any{"email": row.Email, "role": row.Role},
		})
	})
	return created, err
}

func (r *PgRepository) CountOtherActiveOwners(ctx context.Context, id int64) (int64, error) {
	n, err := sqlc.New(r.pool).CountOtherActiveOwners(ctx, id)
	if err != nil {
		return 0, fmt.Errorf("count owners: %w", err)
	}
	return n, nil
}

func (r *PgRepository) SetActive(ctx context.Context, id int64, active bool) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		if err := q.SetUserActive(ctx, sqlc.SetUserActiveParams{ID: id, IsActive: active}); err != nil {
			return fmt.Errorf("update user: %w", err)
		}
		action := audit.ActionUserEnable
		if !active {
			action = audit.ActionUserDisable
			if err := q.DeleteUserSessions(ctx, id); err != nil {
				return fmt.Errorf("delete sessions: %w", err)
			}
		}
		return audit.Write(ctx, q, audit.Entry{Action: action, EntityType: audit.EntityUser, EntityID: &id})
	})
}

func (r *PgRepository) SetPassword(ctx context.Context, id int64, passwordHash string) error {
	return database.InTx(ctx, r.pool, func(q *sqlc.Queries) error {
		if err := q.SetUserPassword(ctx, sqlc.SetUserPasswordParams{ID: id, PasswordHash: passwordHash}); err != nil {
			return fmt.Errorf("update password: %w", err)
		}
		if err := q.DeleteUserSessions(ctx, id); err != nil {
			return fmt.Errorf("delete sessions: %w", err)
		}
		return audit.Write(ctx, q, audit.Entry{
			Action: audit.ActionPasswordReset, EntityType: audit.EntityUser, EntityID: &id,
		})
	})
}

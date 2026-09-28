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
			ID: row.ID, Email: row.Email, Name: row.Name, Role: actor.Role(row.Role), CreatedAt: row.CreatedAt,
		})
	}
	return users, nil
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
		created = User{ID: row.ID, Email: row.Email, Name: row.Name, Role: actor.Role(row.Role), CreatedAt: row.CreatedAt}

		return audit.Write(ctx, q, audit.Entry{
			Action:     audit.ActionUserCreate,
			EntityType: audit.EntityUser,
			EntityID:   &row.ID,
			Detail:     map[string]any{"email": row.Email, "role": row.Role},
		})
	})
	return created, err
}

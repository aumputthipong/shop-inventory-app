package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
)

type PgRepository struct {
	q *sqlc.Queries
}

func NewRepository(pool *pgxpool.Pool) *PgRepository {
	return &PgRepository{q: sqlc.New(pool)}
}

func (r *PgRepository) List(ctx context.Context, limit, offset int32) ([]Log, int64, error) {
	rows, err := r.q.ListAuditLogs(ctx, sqlc.ListAuditLogsParams{PageLimit: limit, PageOffset: offset})
	if err != nil {
		return nil, 0, fmt.Errorf("query audit logs: %w", err)
	}
	total, err := r.q.CountAuditLogs(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("count audit logs: %w", err)
	}

	logs := make([]Log, 0, len(rows))
	for _, row := range rows {
		logs = append(logs, Log{
			ID:         row.ID,
			Action:     row.Action,
			EntityType: row.EntityType,
			EntityID:   row.EntityID,
			Detail:     json.RawMessage(row.Detail),
			ActorName:  row.ActorName,
			CreatedAt:  row.CreatedAt,
		})
	}
	return logs, total, nil
}

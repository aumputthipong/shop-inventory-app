// Package audit records who did what, and lists it for owners.
package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/aumputthipong/shop-inventory-app/backend/db/sqlc"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
)

const (
	ActionProductCreate  = "product.create"
	ActionProductUpdate  = "product.update"
	ActionStockIn        = "stock.in"
	ActionStockAdjust    = "stock.adjust"
	ActionStockReverse   = "stock.reverse"
	ActionCountSubmit    = "count.submit"
	ActionCountApprove   = "count.approve"
	ActionCountReject    = "count.reject"
	ActionOrderCreate    = "order.create"
	ActionOrderRejected  = "order.rejected"
	ActionOrderPack      = "order.pack"
	ActionOrderShip      = "order.ship"
	ActionOrderCancel    = "order.cancel"
	ActionUserCreate     = "user.create"
	ActionUserDisable    = "user.disable"
	ActionUserEnable     = "user.enable"
	ActionPasswordReset  = "user.password_reset"
	ActionPasswordChange = "user.password_change"
	EntityProduct        = "product"
	EntityOrder          = "order"
	EntityStockCount     = "stock_count"
	EntityUser           = "user"
)

type Entry struct {
	Action     string
	EntityType string
	EntityID   *int64
	Detail     map[string]any
}

// Write must run on the same transaction as the change it describes.
func Write(ctx context.Context, q *sqlc.Queries, e Entry) error {
	detail := e.Detail
	if detail == nil {
		detail = map[string]any{}
	}
	raw, err := json.Marshal(detail)
	if err != nil {
		return fmt.Errorf("marshal audit detail: %w", err)
	}

	err = q.InsertAuditLog(ctx, sqlc.InsertAuditLogParams{
		ActorID:    actor.IDFrom(ctx),
		Action:     e.Action,
		EntityType: e.EntityType,
		EntityID:   e.EntityID,
		Detail:     raw,
	})
	if err != nil {
		return fmt.Errorf("insert audit log: %w", err)
	}
	return nil
}

type Log struct {
	ID         int64
	Action     string
	EntityType string
	EntityID   *int64
	Detail     json.RawMessage
	ActorName  *string
	CreatedAt  time.Time
}

type Repository interface {
	List(ctx context.Context, limit, offset int32) ([]Log, int64, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, limit, offset int32) ([]Log, int64, error) {
	logs, total, err := s.repo.List(ctx, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list audit logs: %w", err)
	}
	return logs, total, nil
}

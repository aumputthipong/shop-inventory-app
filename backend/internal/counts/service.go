// Package counts records physical stock counts and turns an approved count
// into ledger adjustments.
package counts

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/platform/actor"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

const (
	MaxLines    = 500
	MaxNoteRune = 500
)

type Status string

const (
	StatusSubmitted Status = "submitted"
	StatusApproved  Status = "approved"
	StatusRejected  Status = "rejected"
)

var (
	ErrNotFound       = errors.New("stock count not found")
	ErrInvalidCount   = errors.New("invalid stock count")
	ErrOwnerOnly      = errors.New("only an owner can approve a stock count")
	ErrUnknownProduct = errors.New("a counted product does not exist")
)

type LineInput struct {
	ProductID int64
	Counted   int32
}

type NewCount struct {
	Note    string
	Lines   []LineInput
	Approve bool
}

type Line struct {
	ProductID int64
	SKU       string
	Name      string
	Expected  int32
	Counted   int32
	OnHandNow int32
}

// Variance is measured against on_hand when the count was saved, so later sales do not distort it.
func (l Line) Variance() int32 {
	return l.Counted - l.Expected
}

type Count struct {
	ID            int64
	Status        Status
	Note          *string
	CreatedByName *string
	DecidedByName *string
	CreatedAt     time.Time
	DecidedAt     *time.Time
	Lines         []Line
}

type Summary struct {
	ID            int64
	Status        Status
	Note          *string
	CreatedByName *string
	CreatedAt     time.Time
	DecidedAt     *time.Time
	LineCount     int64
	DiffCount     int64
}

type Shortage struct {
	ProductID int64
	SKU       string
	Name      string
	Requested int32
	Available int32
}

type InsufficientStockError struct {
	Items []Shortage
}

func (e *InsufficientStockError) Error() string {
	return fmt.Sprintf("%d item(s) would remove stock that orders already hold", len(e.Items))
}

func (e *InsufficientStockError) Is(target error) bool {
	return target == stock.ErrInsufficientStock
}

type StateError struct {
	Status Status
}

func (e *StateError) Error() string {
	return fmt.Sprintf("stock count is already %s", e.Status)
}

type Filter struct {
	Status *Status
	Limit  int32
	Offset int32
}

func (s Status) Valid() bool {
	return s == StatusSubmitted || s == StatusApproved || s == StatusRejected
}

type ApprovalPlanner func(countID int64, lines []Line, locked map[int64]stock.LockedRow) ([]stock.Change, error)

type Repository interface {
	Create(ctx context.Context, in NewCount, plan ApprovalPlanner) (int64, error)
	Decide(ctx context.Context, id int64, to Status, plan ApprovalPlanner) error
	Get(ctx context.Context, id int64) (Count, error)
	List(ctx context.Context, f Filter) ([]Summary, int64, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, in NewCount) (Count, error) {
	in, err := validate(in)
	if err != nil {
		return Count{}, err
	}
	if in.Approve && !isOwner(ctx) {
		return Count{}, ErrOwnerOnly
	}

	id, err := s.repo.Create(ctx, in, PlanApproval)
	if err != nil {
		if errors.Is(err, stock.ErrInsufficientStock) || errors.Is(err, ErrUnknownProduct) {
			return Count{}, err
		}
		return Count{}, fmt.Errorf("create stock count: %w", err)
	}
	return s.Get(ctx, id)
}

func (s *Service) Approve(ctx context.Context, id int64) (Count, error) {
	return s.decide(ctx, id, StatusApproved)
}

func (s *Service) Reject(ctx context.Context, id int64) (Count, error) {
	return s.decide(ctx, id, StatusRejected)
}

func (s *Service) decide(ctx context.Context, id int64, to Status) (Count, error) {
	if !isOwner(ctx) {
		return Count{}, ErrOwnerOnly
	}
	err := s.repo.Decide(ctx, id, to, PlanApproval)
	if err != nil {
		var se *StateError
		if errors.As(err, &se) || errors.Is(err, ErrNotFound) || errors.Is(err, stock.ErrInsufficientStock) {
			return Count{}, err
		}
		return Count{}, fmt.Errorf("mark stock count %s: %w", to, err)
	}
	return s.Get(ctx, id)
}

func (s *Service) Get(ctx context.Context, id int64) (Count, error) {
	c, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return Count{}, err
		}
		return Count{}, fmt.Errorf("get stock count: %w", err)
	}
	return c, nil
}

func (s *Service) List(ctx context.Context, f Filter) ([]Summary, int64, error) {
	if f.Status != nil && !f.Status.Valid() {
		return []Summary{}, 0, nil
	}
	items, total, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list stock counts: %w", err)
	}
	return items, total, nil
}

// PlanApproval turns every counted difference into one ADJUST and refuses to take units that orders hold.
func PlanApproval(countID int64, lines []Line, locked map[int64]stock.LockedRow) ([]stock.Change, error) {
	changes := make([]stock.Change, 0, len(lines))
	var shortages []Shortage
	reason := string(stock.ReasonCountCorrection)
	refType := stock.RefStockCount

	for _, l := range lines {
		v := l.Variance()
		if v == 0 {
			continue
		}
		if v < 0 {
			available := locked[l.ProductID].Balance.Available()
			if available < -v {
				shortages = append(shortages, Shortage{
					ProductID: l.ProductID, SKU: l.SKU, Name: l.Name, Requested: -v, Available: available,
				})
				continue
			}
		}
		changes = append(changes, stock.Change{
			ProductID: l.ProductID,
			Type:      stock.TypeAdjust,
			QtyChange: v,
			RefType:   &refType,
			RefID:     &countID,
			Reason:    &reason,
		})
	}

	if len(shortages) > 0 {
		return nil, &InsufficientStockError{Items: shortages}
	}
	return changes, nil
}

func validate(in NewCount) (NewCount, error) {
	in.Note = strings.TrimSpace(in.Note)
	if utf8.RuneCountInString(in.Note) > MaxNoteRune {
		return in, fmt.Errorf("%w: note is too long", ErrInvalidCount)
	}
	if len(in.Lines) == 0 || len(in.Lines) > MaxLines {
		return in, fmt.Errorf("%w: count between 1 and %d products", ErrInvalidCount, MaxLines)
	}
	seen := make(map[int64]bool, len(in.Lines))
	for _, l := range in.Lines {
		if l.ProductID < 1 || l.Counted < 0 || l.Counted > stock.MaxQty {
			return in, fmt.Errorf("%w: counted quantity out of range", ErrInvalidCount)
		}
		if seen[l.ProductID] {
			return in, fmt.Errorf("%w: product %d is listed twice", ErrInvalidCount, l.ProductID)
		}
		seen[l.ProductID] = true
	}
	return in, nil
}

func isOwner(ctx context.Context) bool {
	a, ok := actor.From(ctx)
	return ok && a.Role == actor.RoleOwner
}

// Package products manages the catalog and reports each product's stock.
package products

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	ErrNotFound     = errors.New("product not found")
	ErrSKUTaken     = errors.New("sku already in use")
	ErrInvalidSKU   = errors.New("sku may use letters, digits, dot, dash and underscore")
	ErrInvalidName  = errors.New("name is required")
	ErrInvalidPrice = errors.New("price must be a number with at most 2 decimals")
)

var (
	skuPattern   = regexp.MustCompile(`^[A-Za-z0-9._-]{1,40}$`)
	pricePattern = regexp.MustCompile(`^\d{1,10}(\.\d{1,2})?$`)
)

type StockStatus string

const (
	StatusInStock    StockStatus = "in_stock"
	StatusLow        StockStatus = "low"
	StatusOutOfStock StockStatus = "out_of_stock"
)

type Product struct {
	ID                int64
	SKU               string
	Name              string
	Price             string
	LowStockThreshold int32
	IsActive          bool
	OnHand            int32
	Reserved          int32
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

func (p Product) Available() int32 {
	return p.OnHand - p.Reserved
}

func (p Product) Status() StockStatus {
	switch available := p.Available(); {
	case available <= 0:
		return StatusOutOfStock
	case available <= p.LowStockThreshold:
		return StatusLow
	default:
		return StatusInStock
	}
}

type Hold struct {
	OrderID   int64
	OrderNo   string
	Channel   string
	Status    string
	Qty       int32
	CreatedAt time.Time
}

type Detail struct {
	Product
	Holds []Hold
}

type Input struct {
	SKU               string
	Name              string
	Price             string
	LowStockThreshold int32
	IsActive          bool
}

type Patch struct {
	SKU               *string
	Name              *string
	Price             *string
	LowStockThreshold *int32
	IsActive          *bool
}

type Repository interface {
	List(ctx context.Context, search *string) ([]Product, error)
	Get(ctx context.Context, id int64) (Product, error)
	Holds(ctx context.Context, id int64) ([]Hold, error)
	Create(ctx context.Context, in Input) (int64, error)
	Update(ctx context.Context, id int64, in Input, changed []string) error
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, search string) ([]Product, error) {
	var q *string
	if trimmed := strings.TrimSpace(search); trimmed != "" {
		q = &trimmed
	}
	items, err := s.repo.List(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}
	return items, nil
}

func (s *Service) Get(ctx context.Context, id int64) (Detail, error) {
	p, err := s.repo.Get(ctx, id)
	if err != nil {
		return Detail{}, wrap("get product", err)
	}
	holds, err := s.repo.Holds(ctx, id)
	if err != nil {
		return Detail{}, fmt.Errorf("list holds: %w", err)
	}
	return Detail{Product: p, Holds: holds}, nil
}

func (s *Service) Create(ctx context.Context, in Input) (Detail, error) {
	in, err := normalize(in)
	if err != nil {
		return Detail{}, err
	}
	id, err := s.repo.Create(ctx, in)
	if err != nil {
		return Detail{}, wrap("create product", err)
	}
	return s.Get(ctx, id)
}

func (s *Service) Update(ctx context.Context, id int64, patch Patch) (Detail, error) {
	current, err := s.repo.Get(ctx, id)
	if err != nil {
		return Detail{}, wrap("get product", err)
	}

	next := Input{
		SKU: current.SKU, Name: current.Name, Price: current.Price,
		LowStockThreshold: current.LowStockThreshold, IsActive: current.IsActive,
	}
	var changed []string
	if patch.SKU != nil {
		next.SKU = *patch.SKU
		changed = append(changed, "sku")
	}
	if patch.Name != nil {
		next.Name = *patch.Name
		changed = append(changed, "name")
	}
	if patch.Price != nil {
		next.Price = *patch.Price
		changed = append(changed, "price")
	}
	if patch.LowStockThreshold != nil {
		next.LowStockThreshold = *patch.LowStockThreshold
		changed = append(changed, "low_stock_threshold")
	}
	if patch.IsActive != nil {
		next.IsActive = *patch.IsActive
		changed = append(changed, "is_active")
	}

	next, err = normalize(next)
	if err != nil {
		return Detail{}, err
	}
	if len(changed) > 0 {
		if err := s.repo.Update(ctx, id, next, changed); err != nil {
			return Detail{}, wrap("update product", err)
		}
	}
	return s.Get(ctx, id)
}

func normalize(in Input) (Input, error) {
	in.SKU = strings.TrimSpace(in.SKU)
	in.Name = strings.TrimSpace(in.Name)
	in.Price = strings.TrimSpace(in.Price)

	if !skuPattern.MatchString(in.SKU) {
		return Input{}, ErrInvalidSKU
	}
	if in.Name == "" || utf8.RuneCountInString(in.Name) > 200 {
		return Input{}, ErrInvalidName
	}
	if !pricePattern.MatchString(in.Price) {
		return Input{}, ErrInvalidPrice
	}
	return in, nil
}

func wrap(op string, err error) error {
	if errors.Is(err, ErrNotFound) || errors.Is(err, ErrSKUTaken) {
		return err
	}
	return fmt.Errorf("%s: %w", op, err)
}

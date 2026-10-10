// Package orders reserves stock for orders and moves them through packing,
// shipping and cancellation.
package orders

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/stock"
)

const MaxItems = 50

type Status string

const (
	StatusReserved Status = "reserved"
	StatusPacked   Status = "packed"
	StatusShipped  Status = "shipped"
	StatusCanceled Status = "canceled"
)

type Channel string

const (
	ChannelStore  Channel = "store"
	ChannelShopee Channel = "shopee"
	ChannelLine   Channel = "line"
)

func (c Channel) Valid() bool {
	return c == ChannelStore || c == ChannelShopee || c == ChannelLine
}

type Action string

const (
	ActionPack   Action = "pack"
	ActionShip   Action = "ship"
	ActionCancel Action = "cancel"
)

type Effect int

const (
	EffectNone Effect = iota
	EffectShip
	EffectRelease
)

var (
	ErrNotFound           = errors.New("order not found")
	ErrExternalRefTaken   = errors.New("external ref already used on this channel")
	ErrInvalidOrder       = errors.New("invalid order")
	ErrProductUnavailable = errors.New("product cannot be ordered")
	ErrExternalRefMissing = errors.New("a Shopee order needs its Shopee order number")
	ErrCustomerMissing    = errors.New("order needs the customer")
)

type ItemRequest struct {
	ProductID int64
	Qty       int32
}

type NewOrder struct {
	Channel     Channel
	ExternalRef string
	Note        string
	Items       []ItemRequest
	// HandedOver records a store sale where the customer leaves with the goods, so it ships at once.
	HandedOver bool
	Customer   *Customer
}

// Customer is who an order ships to. LineUserID is set only for orders placed through LINE.
type Customer struct {
	Name       string
	Phone      string
	Address    string
	LineUserID string
}

type Line struct {
	ProductID int64
	Qty       int32
	UnitPrice string
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
	return fmt.Sprintf("%d item(s) do not have enough available stock", len(e.Items))
}

func (e *InsufficientStockError) Is(target error) bool {
	return target == stock.ErrInsufficientStock
}

type UnavailableProductError struct {
	ProductID int64
	Inactive  bool
}

func (e *UnavailableProductError) Error() string {
	if e.Inactive {
		return fmt.Sprintf("product %d is not active", e.ProductID)
	}
	return fmt.Sprintf("product %d does not exist", e.ProductID)
}

func (e *UnavailableProductError) Is(target error) bool {
	return target == ErrProductUnavailable
}

type TransitionError struct {
	From   Status
	Action Action
}

func (e *TransitionError) Error() string {
	return fmt.Sprintf("cannot %s an order that is %s", e.Action, e.From)
}

type Transition struct {
	To     Status
	Effect Effect
}

type Item struct {
	ProductID int64
	SKU       string
	Name      string
	Qty       int32
	UnitPrice string
}

type Order struct {
	ID            int64
	OrderNo       string
	Channel       Channel
	ExternalRef   *string
	Status        Status
	Total         string
	Note          *string
	CreatedByName *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
	PackedAt      *time.Time
	ShippedAt     *time.Time
	CanceledAt    *time.Time
	Items         []Item
	Customer      *Customer
}

type Summary struct {
	ID            int64
	OrderNo       string
	Channel       Channel
	ExternalRef   *string
	Status        Status
	Total         string
	ItemCount     int32
	CreatedByName *string
	CreatedAt     time.Time
	CustomerName  *string
	Picks         []Pick
}

type Pick struct {
	Name string
	Qty  int32
}

type Filter struct {
	Status      *Status
	Channel     *Channel
	Search      *string
	OldestFirst bool
	Limit       int32
	Offset      int32
}

// Day is one calendar day in the shop's time zone, as the half-open range [Start, End).
type Day struct {
	Date  string
	Start time.Time
	End   time.Time
}

func DayOf(t time.Time, zone *time.Location) Day {
	local := t.In(zone)
	start := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, zone)
	return Day{Date: start.Format(time.DateOnly), Start: start, End: start.AddDate(0, 0, 1)}
}

type ChannelSales struct {
	Channel Channel
	Orders  int32
	Revenue string
}

// Sales counts the orders placed on a day, leaving out canceled ones, and the orders shipped that day.
type Sales struct {
	Date     string
	Orders   int32
	Revenue  string
	Shipped  int32
	Channels []ChannelSales
}

type ReservationPlanner func(locked map[int64]stock.LockedRow) ([]Line, error)

type TransitionPlanner func(from Status) (Transition, error)

type Repository interface {
	Create(ctx context.Context, in NewOrder, plan ReservationPlanner) (int64, error)
	RecordRejection(ctx context.Context, in NewOrder, rejection *InsufficientStockError) error
	Transition(ctx context.Context, id int64, action Action, plan TransitionPlanner) error
	Get(ctx context.Context, id int64) (Order, error)
	List(ctx context.Context, f Filter) ([]Summary, int64, error)
	StatusCounts(ctx context.Context, f Filter) (map[Status]int64, error)
	Sales(ctx context.Context, day Day) (Sales, error)
}

// Notifier hears about every order created or moved, after its transaction commits.
type Notifier interface {
	OrderUpdated(ctx context.Context, o Order)
}

type Service struct {
	repo     Repository
	notifier Notifier
	zone     *time.Location
	now      func() time.Time
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo, zone: time.UTC, now: time.Now}
}

func (s *Service) WithNotifier(n Notifier) *Service {
	s.notifier = n
	return s
}

// WithZone sets the time zone that decides where the shop's day starts and ends.
func (s *Service) WithZone(zone *time.Location) *Service {
	s.zone = zone
	return s
}

func (s *Service) WithClock(now func() time.Time) *Service {
	s.now = now
	return s
}

func (s *Service) notify(ctx context.Context, o Order) {
	if s.notifier != nil {
		s.notifier.OrderUpdated(ctx, o)
	}
}

func (s *Service) Create(ctx context.Context, in NewOrder) (Order, error) {
	in, err := validate(in)
	if err != nil {
		return Order{}, err
	}

	id, err := s.repo.Create(ctx, in, func(locked map[int64]stock.LockedRow) ([]Line, error) {
		return PlanReservation(in.Items, locked)
	})

	var shortage *InsufficientStockError
	if errors.As(err, &shortage) {
		if recErr := s.repo.RecordRejection(ctx, in, shortage); recErr != nil {
			return Order{}, errors.Join(err, fmt.Errorf("record rejection: %w", recErr))
		}
		return Order{}, err
	}
	if err != nil {
		if errors.Is(err, ErrProductUnavailable) || errors.Is(err, ErrExternalRefTaken) {
			return Order{}, err
		}
		return Order{}, fmt.Errorf("create order: %w", err)
	}
	o, err := s.Get(ctx, id)
	if err != nil {
		return Order{}, err
	}
	s.notify(ctx, o)
	return o, nil
}

func (s *Service) Apply(ctx context.Context, id int64, action Action) (Order, error) {
	err := s.repo.Transition(ctx, id, action, func(from Status) (Transition, error) {
		return PlanTransition(from, action)
	})
	if err != nil {
		var te *TransitionError
		if errors.As(err, &te) || errors.Is(err, ErrNotFound) {
			return Order{}, err
		}
		return Order{}, fmt.Errorf("%s order: %w", action, err)
	}
	o, err := s.Get(ctx, id)
	if err != nil {
		return Order{}, err
	}
	s.notify(ctx, o)
	return o, nil
}

func (s *Service) Get(ctx context.Context, id int64) (Order, error) {
	o, err := s.repo.Get(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return Order{}, err
		}
		return Order{}, fmt.Errorf("get order: %w", err)
	}
	return o, nil
}

func (s *Service) List(ctx context.Context, f Filter) ([]Summary, int64, error) {
	items, total, err := s.repo.List(ctx, f)
	if err != nil {
		return nil, 0, fmt.Errorf("list orders: %w", err)
	}
	return items, total, nil
}

// StatusCounts counts the orders matching f's channel and search in every status, ignoring f.Status.
func (s *Service) StatusCounts(ctx context.Context, f Filter) (map[Status]int64, error) {
	counts, err := s.repo.StatusCounts(ctx, f)
	if err != nil {
		return nil, fmt.Errorf("count orders by status: %w", err)
	}
	for _, st := range []Status{StatusReserved, StatusPacked, StatusShipped, StatusCanceled} {
		if _, ok := counts[st]; !ok {
			counts[st] = 0
		}
	}
	return counts, nil
}

func (s *Service) Today(ctx context.Context) (Sales, error) {
	day := DayOf(s.now(), s.zone)
	sales, err := s.repo.Sales(ctx, day)
	if err != nil {
		return Sales{}, fmt.Errorf("sales on %s: %w", day.Date, err)
	}
	sales.Date = day.Date
	sales.Channels = everyChannel(sales.Channels)
	return sales, nil
}

var channels = []Channel{ChannelStore, ChannelShopee, ChannelLine}

func everyChannel(found []ChannelSales) []ChannelSales {
	out := make([]ChannelSales, 0, len(channels))
	for _, ch := range channels {
		cs := ChannelSales{Channel: ch, Revenue: "0.00"}
		for _, f := range found {
			if f.Channel == ch {
				cs = f
			}
		}
		out = append(out, cs)
	}
	return out
}

// PlanReservation is all or nothing: one short line rejects the whole order.
func PlanReservation(items []ItemRequest, locked map[int64]stock.LockedRow) ([]Line, error) {
	lines := make([]Line, 0, len(items))
	var shortages []Shortage

	for _, item := range items {
		row, ok := locked[item.ProductID]
		if !ok {
			return nil, &UnavailableProductError{ProductID: item.ProductID}
		}
		if !row.IsActive {
			return nil, &UnavailableProductError{ProductID: item.ProductID, Inactive: true}
		}
		if available := row.Balance.Available(); available < item.Qty {
			shortages = append(shortages, Shortage{
				ProductID: item.ProductID, SKU: row.SKU, Name: row.Name,
				Requested: item.Qty, Available: max(available, 0),
			})
			continue
		}
		lines = append(lines, Line{ProductID: item.ProductID, Qty: item.Qty, UnitPrice: row.Price})
	}

	if len(shortages) > 0 {
		return nil, &InsufficientStockError{Items: shortages}
	}
	return lines, nil
}

func PlanTransition(from Status, action Action) (Transition, error) {
	switch {
	case action == ActionPack && from == StatusReserved:
		return Transition{To: StatusPacked, Effect: EffectNone}, nil
	case action == ActionShip && from == StatusPacked:
		return Transition{To: StatusShipped, Effect: EffectShip}, nil
	case action == ActionCancel && (from == StatusReserved || from == StatusPacked):
		return Transition{To: StatusCanceled, Effect: EffectRelease}, nil
	}
	return Transition{}, &TransitionError{From: from, Action: action}
}

func validate(in NewOrder) (NewOrder, error) {
	if in.Channel == "" {
		in.Channel = ChannelStore
	}
	if !in.Channel.Valid() {
		return NewOrder{}, fmt.Errorf("%w: unknown channel %q", ErrInvalidOrder, in.Channel)
	}
	in.ExternalRef = strings.TrimSpace(in.ExternalRef)
	in.Note = strings.TrimSpace(in.Note)
	if utf8.RuneCountInString(in.ExternalRef) > 100 || utf8.RuneCountInString(in.Note) > 500 {
		return NewOrder{}, fmt.Errorf("%w: text too long", ErrInvalidOrder)
	}
	if in.Customer != nil {
		c := *in.Customer
		c.Name, c.Phone, c.Address = strings.TrimSpace(c.Name), strings.TrimSpace(c.Phone), strings.TrimSpace(c.Address)
		if utf8.RuneCountInString(c.Name) > 100 || utf8.RuneCountInString(c.Phone) > 20 || utf8.RuneCountInString(c.Address) > 500 {
			return NewOrder{}, fmt.Errorf("%w: customer details too long", ErrInvalidOrder)
		}
		if c.LineUserID != "" && in.Channel != ChannelLine {
			return NewOrder{}, fmt.Errorf("%w: a LINE customer needs the line channel", ErrInvalidOrder)
		}
		in.Customer = &c
	}
	if in.HandedOver && in.Channel != ChannelStore {
		return NewOrder{}, fmt.Errorf("%w: only a store sale can be handed over at once", ErrInvalidOrder)
	}
	if len(in.Items) == 0 || len(in.Items) > MaxItems {
		return NewOrder{}, fmt.Errorf("%w: an order needs 1 to %d items", ErrInvalidOrder, MaxItems)
	}

	seen := make(map[int64]bool, len(in.Items))
	for _, item := range in.Items {
		if item.Qty < 1 || item.Qty > stock.MaxQty {
			return NewOrder{}, fmt.Errorf("%w: quantity out of range", ErrInvalidOrder)
		}
		if seen[item.ProductID] {
			return NewOrder{}, fmt.Errorf("%w: product %d appears twice", ErrInvalidOrder, item.ProductID)
		}
		seen[item.ProductID] = true
	}
	if err := requireDetails(in); err != nil {
		return NewOrder{}, err
	}
	return in, nil
}

// requireDetails asks for what staff need to find the order again: the Shopee
// number, the LINE customer's name, or who comes back for a held store sale.
func requireDetails(in NewOrder) error {
	var name, phone string
	if in.Customer != nil {
		name, phone = in.Customer.Name, in.Customer.Phone
	}
	switch {
	case in.Channel == ChannelShopee && in.ExternalRef == "":
		return ErrExternalRefMissing
	case in.Channel == ChannelLine && name == "":
		return fmt.Errorf("%w: a LINE order needs the customer's name", ErrCustomerMissing)
	case in.Channel == ChannelStore && !in.HandedOver && name == "" && phone == "":
		return fmt.Errorf("%w: a store order picked up later needs the customer's name or phone", ErrCustomerMissing)
	}
	return nil
}

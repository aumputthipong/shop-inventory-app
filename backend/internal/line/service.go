package line

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/products"
)

const (
	ModeOff  = "off"
	ModeDev  = "dev"
	ModeLive = "live"
)

var (
	ErrDisabled = errors.New("ordering through LINE is turned off")
	thaiPhone   = regexp.MustCompile(`^0\d{8,9}$`)
)

// CustomerError names the customer field that needs fixing.
type CustomerError struct {
	Field string
}

func (e *CustomerError) Error() string {
	return fmt.Sprintf("customer %s is missing or invalid", e.Field)
}

type Verifier interface {
	Verify(ctx context.Context, idToken string) (Identity, error)
}

type OrderPlacer interface {
	Create(ctx context.Context, in orders.NewOrder) (orders.Order, error)
}

type ProductLister interface {
	List(ctx context.Context, search string) ([]products.Product, error)
}

type Settings struct {
	Mode   string
	LIFFID string
	OAURL  string
}

type CatalogItem struct {
	ID     int64
	Name   string
	Price  string
	Status products.StockStatus
	// Available is shown only when stock is low, so the shop's exact counts stay private.
	Available *int32
}

type OrderInput struct {
	IDToken string
	Name    string
	Phone   string
	Address string
	Note    string
	Items   []orders.ItemRequest
}

type Service struct {
	settings Settings
	verifier Verifier
	orders   OrderPlacer
	products ProductLister
}

func NewService(settings Settings, v Verifier, o OrderPlacer, p ProductLister) *Service {
	return &Service{settings: settings, verifier: v, orders: o, products: p}
}

func (s *Service) Settings() Settings {
	return s.settings
}

func (s *Service) Catalog(ctx context.Context) ([]CatalogItem, error) {
	if s.settings.Mode == ModeOff {
		return nil, ErrDisabled
	}
	all, err := s.products.List(ctx, "")
	if err != nil {
		return nil, fmt.Errorf("list products: %w", err)
	}

	items := make([]CatalogItem, 0, len(all))
	for _, p := range all {
		if !p.IsActive {
			continue
		}
		item := CatalogItem{ID: p.ID, Name: p.Name, Price: p.Price, Status: p.Status()}
		if item.Status == products.StatusLow {
			available := p.Available()
			item.Available = &available
		}
		items = append(items, item)
	}
	return items, nil
}

// PlaceOrder turns a LINE customer's cart into an order on the same stock as every other channel.
func (s *Service) PlaceOrder(ctx context.Context, in OrderInput) (orders.Order, error) {
	if s.settings.Mode == ModeOff {
		return orders.Order{}, ErrDisabled
	}
	who, err := s.verifier.Verify(ctx, in.IDToken)
	if err != nil {
		return orders.Order{}, err
	}

	customer, err := normalizeCustomer(in)
	if err != nil {
		return orders.Order{}, err
	}
	customer.LineUserID = who.UserID

	o, err := s.orders.Create(ctx, orders.NewOrder{
		Channel:  orders.ChannelLine,
		Note:     in.Note,
		Items:    in.Items,
		Customer: &customer,
	})
	if err != nil {
		return orders.Order{}, fmt.Errorf("place LINE order: %w", err)
	}
	return o, nil
}

func normalizeCustomer(in OrderInput) (orders.Customer, error) {
	name := strings.TrimSpace(in.Name)
	phone := strings.NewReplacer(" ", "", "-", "").Replace(strings.TrimSpace(in.Phone))
	address := strings.TrimSpace(in.Address)

	switch {
	case name == "":
		return orders.Customer{}, &CustomerError{Field: "name"}
	case !thaiPhone.MatchString(phone):
		return orders.Customer{}, &CustomerError{Field: "phone"}
	case address == "":
		return orders.Customer{}, &CustomerError{Field: "address"}
	}
	return orders.Customer{Name: name, Phone: phone, Address: address}, nil
}

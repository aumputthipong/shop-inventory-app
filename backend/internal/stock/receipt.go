package stock

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/aumputthipong/shop-inventory-app/backend/internal/audit"
)

const (
	RefReceipt       = "receipt"
	MaxReceiptLines  = 100
	maxReferenceRune = 100
	maxNoteRune      = 500
)

var ErrInvalidReceipt = errors.New("invalid receipt")

type ReceiptLine struct {
	ProductID int64
	Qty       int32
}

type NewReceipt struct {
	Reference string
	Note      string
	Lines     []ReceiptLine
}

type ReceivedLine struct {
	ProductID int64
	SKU       string
	Name      string
	Qty       int32
	Balance   Balance
}

type Receipt struct {
	ID        int64
	Reference *string
	Note      *string
	CreatedAt time.Time
	Lines     []ReceivedLine
}

// Receive books every line of one delivery in a single transaction, so a bad line leaves nothing half received.
func (s *Service) Receive(ctx context.Context, in NewReceipt) (Receipt, error) {
	in, err := validateReceipt(in)
	if err != nil {
		return Receipt{}, err
	}

	lines := make([]map[string]any, 0, len(in.Lines))
	for _, l := range in.Lines {
		lines = append(lines, map[string]any{"product_id": l.ProductID, "qty": l.Qty})
	}
	entry := audit.Entry{
		Action:     audit.ActionStockReceive,
		EntityType: audit.EntityReceipt,
		Detail:     map[string]any{"reference": in.Reference, "lines": lines},
	}

	r, err := s.repo.Receive(ctx, in, entry)
	if err != nil {
		if errors.Is(err, ErrProductNotFound) {
			return Receipt{}, err
		}
		return Receipt{}, fmt.Errorf("receive stock: %w", err)
	}
	return r, nil
}

func validateReceipt(in NewReceipt) (NewReceipt, error) {
	in.Reference = strings.TrimSpace(in.Reference)
	in.Note = strings.TrimSpace(in.Note)
	if utf8.RuneCountInString(in.Reference) > maxReferenceRune || utf8.RuneCountInString(in.Note) > maxNoteRune {
		return in, fmt.Errorf("%w: reference or note is too long", ErrInvalidReceipt)
	}
	if len(in.Lines) == 0 || len(in.Lines) > MaxReceiptLines {
		return in, fmt.Errorf("%w: receive between 1 and %d products", ErrInvalidReceipt, MaxReceiptLines)
	}
	seen := make(map[int64]bool, len(in.Lines))
	for _, l := range in.Lines {
		if l.ProductID < 1 || l.Qty < 1 || l.Qty > MaxQty {
			return in, fmt.Errorf("%w: quantity out of range", ErrInvalidReceipt)
		}
		if seen[l.ProductID] {
			return in, fmt.Errorf("%w: product %d is listed twice", ErrInvalidReceipt, l.ProductID)
		}
		seen[l.ProductID] = true
	}
	return in, nil
}

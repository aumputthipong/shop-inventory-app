package line

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	httpx "github.com/aumputthipong/shop-inventory-app/backend/internal/http"
	"github.com/aumputthipong/shop-inventory-app/backend/internal/orders"
)

type Messenger interface {
	Push(ctx context.Context, to, text string) error
}

// Notifier tells a LINE customer when their order is placed, packed, shipped or canceled.
type Notifier struct {
	messenger Messenger
	logger    *slog.Logger
}

func NewNotifier(m Messenger, logger *slog.Logger) *Notifier {
	return &Notifier{messenger: m, logger: logger}
}

// OrderUpdated never fails the order: the stock change has already committed, so a lost message is only logged.
func (n *Notifier) OrderUpdated(ctx context.Context, o orders.Order) {
	if o.Customer == nil || o.Customer.LineUserID == "" {
		return
	}
	if err := n.messenger.Push(ctx, o.Customer.LineUserID, MessageFor(o)); err != nil {
		n.logger.WarnContext(ctx, "line message not delivered",
			slog.String("order_no", o.OrderNo),
			slog.String("status", string(o.Status)),
			slog.String("request_id", httpx.RequestIDFrom(ctx)),
			slog.String("error", err.Error()))
	}
}

func MessageFor(o orders.Order) string {
	switch o.Status {
	case orders.StatusPacked:
		return fmt.Sprintf("ออเดอร์ %s แพ็กเรียบร้อยแล้ว กำลังจะส่งออก", o.OrderNo)
	case orders.StatusShipped:
		return fmt.Sprintf("ออเดอร์ %s ส่งแล้ว ขอบคุณที่สั่งซื้อ", o.OrderNo)
	case orders.StatusCanceled:
		return fmt.Sprintf("ออเดอร์ %s ถูกยกเลิก มีคำถามทักแชทร้านได้เลย", o.OrderNo)
	default:
		var b strings.Builder
		fmt.Fprintf(&b, "ได้รับออเดอร์ %s แล้ว\n", o.OrderNo)
		for _, it := range o.Items {
			fmt.Fprintf(&b, "- %s x %d\n", it.Name, it.Qty)
		}
		fmt.Fprintf(&b, "รวม %s บาท\nร้านจะแจ้งอีกครั้งเมื่อส่งของ", baht(o.Total))
		return b.String()
	}
}

func baht(amount string) string {
	whole, frac, _ := strings.Cut(amount, ".")
	var b strings.Builder
	for i, r := range whole {
		if i > 0 && (len(whole)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(r)
	}
	if frac != "" && frac != "00" {
		b.WriteString("." + frac)
	}
	return b.String()
}

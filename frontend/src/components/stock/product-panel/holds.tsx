import { Link } from '@tanstack/react-router'

import { ChannelChip, OrderStatusText } from '@/components/chip'
import type { ProductDetail } from '@/lib/api'
import { formatDateTime } from '@/lib/format'

export function Holds({ product }: { product: ProductDetail }) {
  return (
    <section aria-label="ออเดอร์ที่จองไว้" className="flex flex-col">
      <header className="flex items-baseline justify-between sheet-head px-5 pt-4 pb-2">
        <h3 className="font-bold">ออเดอร์ที่จองไว้</h3>
        <span className="text-[13px] text-ink-2">{product.holds.length} ออเดอร์</span>
      </header>
      {product.holds.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-ink-2">
          ยังไม่มีออเดอร์จองสินค้านี้ ของทั้งหมดขายได้
        </p>
      ) : (
        <ul>
          {product.holds.map((h) => (
            <li
              key={h.order_id}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_28px] items-center gap-x-4 border-b border-line px-5 py-2.5 text-[13px] last:border-b-0"
            >
              <span className="flex min-w-0 flex-col">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: h.order_id }}
                  className="code text-sm whitespace-nowrap hover:text-brand-600 hover:underline"
                >
                  {h.order_no}
                </Link>
                <span className="text-ink-2">สั่งเมื่อ {formatDateTime(h.created_at)}</span>
              </span>
              <ChannelChip channel={h.channel} />
              <OrderStatusText status={h.status} />
              <span className="text-right font-semibold">{h.qty}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import { Link } from '@tanstack/react-router'

import { ChannelChip, Chip } from '@/components/chip'
import type { ProductDetail } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { orderStatusChip } from '@/lib/labels'

export function Holds({ product }: { product: ProductDetail }) {
  if (product.holds.length === 0) {
    return (
      <p className="px-5 py-5 text-[13px] text-ink-2">
        ยังไม่มีออเดอร์จองสินค้านี้ ของทั้งหมดพร้อมขาย
      </p>
    )
  }
  return (
    <ul>
      {product.holds.map((h) => {
        const chip = orderStatusChip[h.status]
        return (
          <li
            key={h.order_id}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b border-line px-5 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-col">
              <Link
                to="/orders/$orderId"
                params={{ orderId: h.order_id }}
                className="code text-sm font-medium hover:text-petrol-600 hover:underline"
              >
                {h.order_no}
              </Link>
              <span className="flex gap-3 text-xs text-ink-3">
                <span>{h.qty} ชิ้น</span>
                <span>สั่งเมื่อ {formatDateTime(h.created_at)}</span>
              </span>
            </div>
            <ChannelChip channel={h.channel} />
            <Chip tone={chip.tone}>{chip.label}</Chip>
          </li>
        )
      })}
    </ul>
  )
}

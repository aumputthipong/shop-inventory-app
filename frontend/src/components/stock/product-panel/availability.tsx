import { cn } from 'cn'
import { BellIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import type { ProductDetail } from '@/lib/api'
import { stockStatusChip } from '@/lib/labels'

export function Availability({
  product,
  isOwner,
  onEditAlert,
}: {
  product: ProductDetail
  isOwner: boolean
  onEditAlert: () => void
}) {
  const chip = stockStatusChip[product.stock_status]
  const orders = product.holds.length
  const available = Math.max(product.available, 0)
  const status =
    product.stock_status === 'out_of_stock'
      ? 'ของหมดแล้ว ออเดอร์ใหม่จะถูกปฏิเสธจนกว่าจะเติมของ'
      : product.stock_status === 'low'
        ? `ใกล้หมดแล้ว แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`
        : `แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`

  return (
    <div className="flex flex-col gap-4 border-b border-line px-5 py-5">
      <dl className="grid grid-cols-[1fr_1fr_auto] items-end gap-4">
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-ink-2">มีในคลัง</dt>
          <dd className="figure text-2xl">{product.on_hand}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-[13px] text-ink-2">จองไว้{orders > 0 && ` ${orders} ออเดอร์`}</dt>
          <dd className={cn('figure text-2xl', product.reserved === 0 && 'text-ink-3')}>
            {product.reserved}
          </dd>
        </div>
        <div className="flex flex-col items-end gap-1 border-l border-line pl-6">
          <dt className="flex items-center gap-2 text-[13px] text-ink-2">
            {product.stock_status !== 'in_stock' && <Chip tone={chip.tone}>{chip.label}</Chip>}
            ขายได้อีก
          </dt>
          <dd
            aria-label={`ขายได้อีก ${available} ชิ้น`}
            className={cn('figure text-[40px]', available === 0 && 'text-late')}
          >
            {available}
          </dd>
        </div>
      </dl>
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        <BellIcon
          className={cn(
            'size-4 shrink-0',
            product.stock_status === 'out_of_stock' && 'text-late',
            product.stock_status === 'low' && 'text-chip-warn-fg',
          )}
          aria-hidden="true"
        />
        <span>{status}</span>
        {isOwner && (
          <button
            type="button"
            onClick={onEditAlert}
            className="ml-auto font-medium whitespace-nowrap text-brand-600 underline decoration-line-strong underline-offset-4 hover:decoration-brand-600"
          >
            ตั้งค่าแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}

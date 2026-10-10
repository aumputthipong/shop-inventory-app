import { cn } from 'cn'
import { BellIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { UnitLegend, UnitStrip } from '@/components/unit-strip'
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
  const summary =
    product.reserved > 0
      ? `มีในคลัง ${product.on_hand} ชิ้น จองไว้ให้ ${orders} ออเดอร์ รวม ${product.reserved} ชิ้น`
      : `มีในคลัง ${product.on_hand} ชิ้น ยังไม่มีออเดอร์จอง`
  const status =
    product.stock_status === 'out_of_stock'
      ? 'ของหมดแล้ว ออเดอร์ใหม่จะถูกปฏิเสธจนกว่าจะเติมของ'
      : product.stock_status === 'low'
        ? `ใกล้หมดแล้ว แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`
        : `แจ้งเตือนเมื่อเหลือ ${product.low_stock_threshold} ชิ้นหรือน้อยกว่า`

  return (
    <div className="flex flex-col gap-3 border-b border-line px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[13px] text-ink-2">ขายได้อีก</span>
          <span className="mt-1 flex items-baseline gap-2">
            <span className={cn('count text-[64px]', product.available <= 0 && 'text-destructive')}>
              {Math.max(product.available, 0)}
            </span>
            <span className="text-base text-ink-2">ชิ้น</span>
          </span>
        </div>
        {product.stock_status !== 'in_stock' && <Chip tone={chip.tone}>{chip.label}</Chip>}
      </div>
      <span className="text-[13px] text-ink-2">{summary}</span>
      <UnitStrip size="lg" available={product.available} held={product.reserved} />
      <UnitLegend />
      <div className="flex items-center gap-2 text-[13px] text-ink-2">
        <BellIcon
          className={cn(
            'size-4 shrink-0',
            product.stock_status === 'out_of_stock' && 'text-destructive',
            product.stock_status === 'low' && 'text-chip-warn-fg',
          )}
          aria-hidden="true"
        />
        <span>{status}</span>
        {isOwner && (
          <button
            type="button"
            onClick={onEditAlert}
            className="ml-auto font-medium whitespace-nowrap text-brand-600 hover:underline"
          >
            ตั้งค่าแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}

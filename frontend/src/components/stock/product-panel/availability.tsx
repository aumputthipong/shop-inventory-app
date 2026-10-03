import { cn } from 'cn'
import { BellIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { HelpNote } from '@/components/help-note'
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
          <span className="flex items-baseline gap-1.5">
            <span
              className={cn(
                'text-5xl leading-[52px] font-semibold tracking-tight',
                product.available <= 0 && 'text-destructive',
              )}
            >
              {Math.max(product.available, 0)}
            </span>
            <span className="text-base text-ink-2">ชิ้น</span>
          </span>
        </div>
        <Chip tone={chip.tone}>{chip.label}</Chip>
      </div>
      <span className="text-[13px] text-ink-2">{summary}</span>
      <UnitStrip size="lg" available={product.available} held={product.reserved} />
      <UnitLegend />
      <HelpNote question="ขายได้ มีในคลัง จองแล้ว ต่างกันยังไง">
        <p>
          <span className="font-medium text-ink">มีในคลัง</span> คือของที่อยู่ในร้านจริง
          รวมของที่แพ็กแล้วแต่ยังไม่ได้ส่ง
        </p>
        <p>
          <span className="font-medium text-ink">จองแล้ว</span> คือของที่มีออเดอร์สั่งไว้
          แต่ยังไม่ได้ส่ง ช่องทางอื่นจะขายชิ้นนี้ซ้ำไม่ได้
        </p>
        <p>
          <span className="font-medium text-ink">ขายได้</span> = มีในคลัง − จองแล้ว
          คือจำนวนที่ยังรับออเดอร์ใหม่ได้ เมื่อกดส่งของ ชิ้นนั้นจะออกจากคลัง
        </p>
      </HelpNote>
      <div
        className={cn(
          'flex items-center gap-2 text-[13px]',
          product.stock_status === 'out_of_stock'
            ? 'text-destructive'
            : product.stock_status === 'low'
              ? 'text-chip-warn-fg'
              : 'text-ink-2',
        )}
      >
        <BellIcon className="size-4 shrink-0" aria-hidden="true" />
        <span>{status}</span>
        {isOwner && (
          <button
            type="button"
            onClick={onEditAlert}
            className="ml-auto font-medium whitespace-nowrap text-petrol-600 hover:underline"
          >
            ตั้งค่าแจ้งเตือน
          </button>
        )}
      </div>
    </div>
  )
}

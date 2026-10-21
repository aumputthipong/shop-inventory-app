import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'

import { ReverseMovementButton } from '@/components/stock/reverse-movement'
import type { Movement, ProductDetail } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { movementChip, movementReason } from '@/lib/labels'
import { canReverse } from '@/lib/movements'
import { movementsQueryOptions } from '@/lib/queries'

const SHOWN = 6
const cols = 'grid-cols-[48px_minmax(0,1fr)_36px_36px_52px_32px]'
const day = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' })

function reference(m: Movement): string | null {
  return m.order_no ?? m.receipt_reference ?? movementReason(m.reason) ?? m.note
}

export function RecentMoves({ product, isOwner }: { product: ProductDetail; isOwner: boolean }) {
  const { data, isPending } = useQuery(movementsQueryOptions({ product_id: product.id, limit: 30 }))
  const rows = data?.items
    .filter((m) => m.qty_change !== 0)
    .slice(0, SHOWN)
    .reverse()
  const first = rows?.[0]
  const broughtForward = first ? first.on_hand_after - first.qty_change : 0

  return (
    <section aria-label="ความเคลื่อนไหวล่าสุด" className="flex flex-col">
      <header className="flex items-baseline justify-between sheet-head px-5 pt-4 pb-2">
        <h3 className="font-bold">ความเคลื่อนไหวล่าสุด</h3>
        <Link
          to="/ledger"
          search={{ product: product.id }}
          className="text-[13px] font-medium text-brand-600 underline decoration-line-strong underline-offset-4 hover:decoration-brand-600"
        >
          ดูประวัติทั้งหมด
        </Link>
      </header>
      <div
        aria-hidden="true"
        className={cn('grid gap-2 border-b border-line px-5 py-1.5 text-xs text-ink-2', cols)}
      >
        <span>วันที่</span>
        <span>รายการ</span>
        <span className="text-right">เข้า</span>
        <span className="text-right">ออก</span>
        <span className="text-right">คงเหลือ</span>
        <span />
      </div>

      {isPending && <p className="px-5 py-4 text-[13px] text-ink-2">กำลังโหลด...</p>}
      {rows?.length === 0 && (
        <p className="px-5 py-4 text-[13px] text-ink-2">ยังไม่มีของเข้าหรือออก</p>
      )}

      {rows && rows.length > 0 && (
        <ol className="text-[13px]">
          {broughtForward !== 0 && (
            <li className={cn('grid min-h-10 items-center gap-2 border-b border-line px-5', cols)}>
              <span />
              <span className="text-ink-2">ยอดยกมา</span>
              <span />
              <span />
              <span className="text-right font-semibold">{broughtForward}</span>
              <span />
            </li>
          )}
          {rows.map((m) => {
            const ref = reference(m)
            return (
              <li
                key={m.id}
                className={cn(
                  'grid min-h-12 items-center gap-2 border-b border-line px-5 py-1.5',
                  cols,
                )}
              >
                <span title={formatDateTime(m.created_at)} className="text-ink-2">
                  {day.format(new Date(m.created_at))}
                </span>
                <span
                  className={cn(
                    'flex min-w-0 flex-col break-words',
                    m.reversed && 'text-ink-3 line-through',
                  )}
                >
                  <span>{movementChip[m.type].label}</span>
                  {ref && <span className="text-ink-2">{ref}</span>}
                </span>
                <span className="text-right">{m.qty_change > 0 ? m.qty_change : ''}</span>
                <span className="text-right text-late">
                  {m.qty_change < 0 ? Math.abs(m.qty_change) : ''}
                </span>
                <span className="text-right font-semibold">{m.on_hand_after}</span>
                <span className="flex justify-end">
                  {isOwner && canReverse(m) && <ReverseMovementButton movement={m} compact />}
                </span>
              </li>
            )
          })}
          <li className={cn('grid min-h-11 items-center gap-2 border-t-2 border-ink px-5', cols)}>
            <span className="col-span-2 font-bold">คงเหลือวันนี้</span>
            <span />
            <span />
            <span className="figure text-right text-lg">{product.on_hand}</span>
            <span />
          </li>
        </ol>
      )}
    </section>
  )
}

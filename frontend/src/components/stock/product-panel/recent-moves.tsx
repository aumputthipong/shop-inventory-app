import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

import { Chip } from '@/components/chip'
import { ReverseMovementButton } from '@/components/stock/reverse-movement'
import { formatDateTime, formatSigned } from '@/lib/format'
import { movementChip, movementReason } from '@/lib/labels'
import { canReverse } from '@/lib/movements'
import { movementsQueryOptions } from '@/lib/queries'

export function RecentMoves({ productId, isOwner }: { productId: number; isOwner: boolean }) {
  const { data, isPending } = useQuery(movementsQueryOptions({ product_id: productId, limit: 5 }))

  if (isPending) return <p className="px-5 py-5 text-[13px] text-ink-2">กำลังโหลด...</p>
  if (!data || data.items.length === 0) {
    return <p className="px-5 py-5 text-[13px] text-ink-2">ยังไม่มีความเคลื่อนไหว</p>
  }

  return (
    <div className="flex flex-col">
      {data.items.map((m) => {
        const chip = movementChip[m.type]
        const ref = m.order_no ?? movementReason(m.reason) ?? m.note ?? ''
        const change =
          m.qty_change !== 0
            ? formatSigned(m.qty_change)
            : `${m.reserved_change > 0 ? 'จอง' : 'คืน'} ${Math.abs(m.reserved_change)}`
        return (
          <div
            key={m.id}
            className="grid grid-cols-[80px_minmax(0,1fr)_56px_44px_auto] items-center gap-2 border-b border-line px-5 py-2.5"
          >
            <span className="text-xs text-ink-3">{formatDateTime(m.created_at)}</span>
            <span className="flex min-w-0 flex-col items-start gap-0.5">
              <span className="flex gap-1">
                <Chip tone={chip.tone}>{chip.label}</Chip>
                {m.reversed && <Chip tone="neutral">ยกเลิกแล้ว</Chip>}
              </span>
              <span className="max-w-full truncate text-xs text-ink-3">{ref}</span>
            </span>
            <span className="text-right text-[13px]">{change}</span>
            <span className="flex flex-col items-end">
              <span className="text-[13px] font-medium text-ink-2">{m.available_after}</span>
              <span className="text-[11px] text-ink-3">ขายได้</span>
            </span>
            <span className="flex justify-end">
              {isOwner && canReverse(m) && <ReverseMovementButton movement={m} />}
            </span>
          </div>
        )
      })}
      <Link
        to="/ledger"
        search={{ product: productId }}
        className="px-5 py-3 text-[13px] font-medium text-brand-600 hover:underline"
      >
        ดูประวัติทั้งหมด
      </Link>
    </div>
  )
}

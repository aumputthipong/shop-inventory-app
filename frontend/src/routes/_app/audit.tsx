import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { Pager } from '@/components/pager'
import type { AuditLog } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { requireOwner } from '@/lib/guards'
import { auditActionLabel, type ChipTone } from '@/lib/labels'
import { auditQueryOptions } from '@/lib/queries'

const PAGE = 30

export const Route = createFileRoute('/_app/audit')({
  validateSearch: (search: Record<string, unknown>): { offset?: number } => ({
    offset: Number(search.offset) > 0 ? Number(search.offset) : undefined,
  }),
  beforeLoad: ({ context }) => {
    requireOwner(context.me)
  },
  component: AuditPage,
})

function tone(action: string): ChipTone {
  if (action === 'order.rejected') return 'bad'
  if (action.startsWith('stock.')) return 'ok'
  if (action.startsWith('order.')) return 'info'
  if (action.startsWith('user.')) return 'violet'
  return 'neutral'
}

function describe(log: AuditLog): string {
  const d = log.detail
  const text = (key: string) =>
    typeof d[key] === 'string' || typeof d[key] === 'number' ? String(d[key]) : ''
  switch (log.action) {
    case 'stock.in':
      return `รับเข้า ${text('qty')} ชิ้น เหลือขายได้ ${text('available_after')}`
    case 'stock.adjust':
      return `ปรับ ${text('qty_change')} ชิ้น เหลือขายได้ ${text('available_after')}`
    case 'order.create':
    case 'order.pack':
    case 'order.ship':
    case 'order.cancel':
      return text('order_no')
    case 'order.rejected': {
      const shortages = Array.isArray(d.shortages) ? (d.shortages as { sku?: string }[]) : []
      return `ของไม่พอ: ${shortages.map((s) => s.sku ?? '').join(', ')}`
    }
    case 'product.create':
    case 'product.update':
      return `${text('sku')} ${text('name')}`
    case 'user.create':
      return text('email')
    default:
      return ''
  }
}

function AuditPage() {
  const { offset = 0 } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data, isPending } = useQuery(auditQueryOptions({ limit: PAGE, offset }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px] leading-[42px] font-bold">บันทึกการใช้งาน</h1>
        <p className="text-base text-sand-800">
          ใครทำอะไรเมื่อไร รวมถึงออเดอร์ที่ระบบปฏิเสธเพราะของไม่พอ
        </p>
      </div>

      <section
        aria-label="บันทึกการใช้งาน"
        className="overflow-x-auto rounded-[22px] bg-white p-3 shadow-soft"
      >
        <div className="grid h-9 min-w-[760px] grid-cols-[120px_140px_220px_minmax(0,1fr)] items-center gap-4 px-4 text-[13px] font-medium text-sand-800">
          <span>เวลา</span>
          <span>ผู้ใช้</span>
          <span>การกระทำ</span>
          <span>รายละเอียด</span>
        </div>
        {isPending && <p className="px-4 py-8 text-sand-800">กำลังโหลด...</p>}
        {data?.items.length === 0 && <EmptyState title="ยังไม่มีบันทึก" />}
        <ul className="flex flex-col">
          {data?.items.map((log) => (
            <li
              key={log.id}
              className="grid min-h-14 min-w-[760px] grid-cols-[120px_140px_220px_minmax(0,1fr)] items-center gap-4 border-b border-sand-200 px-4 py-2.5 last:border-b-0"
            >
              <span className="text-[13px] text-sand-800">{formatDateTime(log.created_at)}</span>
              <span className="truncate">{log.actor_name ?? 'ระบบ'}</span>
              <span>
                <Chip tone={tone(log.action)}>{auditActionLabel[log.action] ?? log.action}</Chip>
              </span>
              <span className="truncate text-sand-900">{describe(log)}</span>
            </li>
          ))}
        </ul>
        {data && data.total > 0 && (
          <Pager
            offset={offset}
            limit={PAGE}
            total={data.total}
            onChange={(next) => {
              void navigate({ search: { offset: next || undefined }, replace: true })
            }}
          />
        )}
      </section>
    </div>
  )
}

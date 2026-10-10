import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { ReverseMovementButton } from '@/components/stock/reverse-movement'
import type { MovementType } from '@/lib/api'
import { formatDateTime, formatSigned } from '@/lib/format'
import { channelLabel, movementChip, movementReason } from '@/lib/labels'
import { canReverse } from '@/lib/movements'
import { movementsQueryOptions, productsQueryOptions } from '@/lib/queries'
import { parseOffset } from '@/lib/search-params'
import { useCurrentUser } from '@/lib/session'

const PAGE = 25
const TYPES: MovementType[] = ['STOCK_IN', 'RESERVE', 'RELEASE', 'SHIP', 'ADJUST']

interface LedgerSearch {
  product?: number
  type?: MovementType
  offset?: number
}

export const Route = createFileRoute('/_app/ledger')({
  validateSearch: (search: Record<string, unknown>): LedgerSearch => ({
    product: Number(search.product) > 0 ? Number(search.product) : undefined,
    type: TYPES.includes(search.type as MovementType) ? (search.type as MovementType) : undefined,
    offset: parseOffset(search.offset),
  }),
  component: LedgerPage,
})

function LedgerPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const offset = search.offset ?? 0
  const { data, isPending } = useQuery(
    movementsQueryOptions({ product_id: search.product, type: search.type, limit: PAGE, offset }),
  )
  const { data: products } = useQuery(productsQueryOptions)
  const product = products?.find((p) => p.id === search.product)
  const me = useCurrentUser()

  const setSearch = (next: LedgerSearch) => {
    void navigate({ search: next, replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ประวัติสต็อก" />

      <section aria-label="ความเคลื่อนไหวของสต็อก" className="panel overflow-x-auto">
        <div className="flex min-w-[1160px] flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-4 pt-2">
          <FilterTabs
            label="ประเภทความเคลื่อนไหว"
            value={search.type}
            onChange={(type) => {
              setSearch({ ...search, type, offset: undefined })
            }}
            options={[
              { value: undefined, label: 'ทั้งหมด' },
              ...TYPES.map((type) => ({ value: type, label: movementChip[type].label })),
            ]}
          />
          {search.product !== undefined && (
            <span className="mb-2 flex h-7 items-center gap-1.5 rounded-sm border border-brand-200 bg-brand-50 pr-1 pl-2.5 text-[13px] text-brand-700">
              เฉพาะ {product?.name ?? 'สินค้าที่เลือก'}
              <button
                type="button"
                aria-label="ดูทุกสินค้า"
                onClick={() => {
                  setSearch({ ...search, product: undefined, offset: undefined })
                }}
                className="flex size-5 items-center justify-center rounded-xs hover:bg-brand-100"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>

        <div className="grid h-9 min-w-[1160px] grid-cols-[110px_minmax(0,1.2fr)_110px_72px_72px_120px_minmax(0,1fr)_90px_80px] items-center gap-3 border-b border-line px-4 text-[13px] text-ink-2">
          <span>เวลา</span>
          <span>สินค้า</span>
          <span>ประเภท</span>
          <span className="text-right">ในคลัง</span>
          <span className="text-right">จอง</span>
          <span className="text-right">คงเหลือ</span>
          <span className="pl-5">อ้างอิง</span>
          <span>โดย</span>
          <span />
        </div>

        {isPending && <p className="px-4 py-8 text-ink-2">กำลังโหลด...</p>}
        {data?.items.length === 0 && (
          <EmptyState
            title="ยังไม่มีความเคลื่อนไหว"
            body="เมื่อรับของเข้า ขาย หรือปรับยอด รายการจะขึ้นที่นี่"
          />
        )}

        <ul className="flex flex-col">
          {data?.items.map((m) => {
            const chip = movementChip[m.type]
            const reason = movementReason(m.reason)
            return (
              <li
                key={m.id}
                className="grid min-h-12 min-w-[1160px] grid-cols-[110px_minmax(0,1.2fr)_110px_72px_72px_120px_minmax(0,1fr)_90px_80px] items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
              >
                <span className="text-[13px] text-ink-2">{formatDateTime(m.created_at)}</span>
                <span className="flex min-w-0 flex-col">
                  <Link
                    to="/stock"
                    search={{ product: m.product_id }}
                    className="truncate font-medium hover:text-brand-600 hover:underline"
                  >
                    {m.product_name}
                  </Link>
                  <span className="code text-xs text-ink-3">{m.sku}</span>
                </span>
                <span className="flex flex-wrap gap-1">
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                  {m.reversed && <Chip tone="neutral">ยกเลิกแล้ว</Chip>}
                </span>
                <span className={cn('text-right font-medium', m.qty_change === 0 && 'text-ink-3')}>
                  {formatSigned(m.qty_change)}
                </span>
                <span
                  className={cn('text-right font-medium', m.reserved_change === 0 && 'text-ink-3')}
                >
                  {formatSigned(m.reserved_change)}
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-sm font-medium">ขายได้ {m.available_after}</span>
                  <span className="text-xs text-ink-2">มีในคลัง {m.on_hand_after}</span>
                </span>
                <span className="flex min-w-0 flex-col pl-5 text-sm">
                  {m.order_id !== null && m.order_no ? (
                    <>
                      <Link
                        to="/orders/$orderId"
                        params={{ orderId: m.order_id }}
                        className="code self-start hover:text-brand-600 hover:underline"
                      >
                        {m.order_no}
                      </Link>
                      {m.order_channel && (
                        <span className="text-xs text-ink-2">{channelLabel[m.order_channel]}</span>
                      )}
                    </>
                  ) : m.receipt_id !== null ? (
                    <span className="font-medium">
                      {m.receipt_reference ? (
                        <>
                          ใบส่งของ <span className="code">{m.receipt_reference}</span>
                        </>
                      ) : (
                        `รับของชุด #${m.receipt_id}`
                      )}
                    </span>
                  ) : m.count_id !== null ? (
                    <Link
                      to="/counts/$countId"
                      params={{ countId: m.count_id }}
                      className="font-medium hover:text-brand-600 hover:underline"
                    >
                      ตรวจนับ #{m.count_id}
                    </Link>
                  ) : (
                    reason && (
                      <span className="font-medium">
                        {reason}
                        {m.reverses_id !== null && (
                          <span className="font-normal text-ink-3">
                            {' '}
                            ของรายการ #{m.reverses_id}
                          </span>
                        )}
                      </span>
                    )
                  )}
                  {m.note && <span className="truncate text-xs text-ink-2">{m.note}</span>}
                </span>
                <span className="truncate text-sm text-ink-2">{m.created_by_name ?? '-'}</span>
                <span className="flex justify-end">
                  {me.isOwner && canReverse(m) && <ReverseMovementButton movement={m} />}
                </span>
              </li>
            )
          })}
        </ul>

        {data && data.total > 0 && (
          <Pager
            offset={offset}
            limit={PAGE}
            total={data.total}
            onChange={(next) => {
              setSearch({ ...search, offset: next || undefined })
            }}
          />
        )}
      </section>
    </div>
  )
}

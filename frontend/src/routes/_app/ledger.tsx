import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { Pager } from '@/components/pager'
import type { MovementType } from '@/lib/api'
import { formatDateTime, formatSigned } from '@/lib/format'
import { channelLabel, movementChip, movementReason } from '@/lib/labels'
import { movementsQueryOptions, productsQueryOptions } from '@/lib/queries'

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
    offset: Number(search.offset) > 0 ? Number(search.offset) : undefined,
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

  const setSearch = (next: LedgerSearch) => {
    void navigate({ search: next, replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[30px] leading-[42px] font-bold">ประวัติสต็อก</h1>
        <p className="text-base text-sand-800">
          ทุกการเปลี่ยนแปลงของสต็อกถูกบันทึกที่นี่ ยอดคงเหลือทุกตัวอธิบายได้จากรายการเหล่านี้
        </p>
      </div>

      <section
        aria-label="ความเคลื่อนไหวของสต็อก"
        className="overflow-x-auto rounded-[22px] bg-white p-3 shadow-soft"
      >
        <div className="flex flex-wrap items-center gap-2 px-2 pt-2 pb-4">
          {[undefined, ...TYPES].map((type) => {
            const active = search.type === type
            return (
              <button
                key={type ?? 'all'}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSearch({ ...search, type, offset: undefined })
                }}
                className={cn(
                  'h-10 rounded-full px-4 text-[15px] font-medium',
                  active
                    ? 'bg-ink text-white'
                    : 'bg-sand-100 text-sand-800 hover:bg-sand-200 hover:text-ink',
                )}
              >
                {type ? movementChip[type].label : 'ทั้งหมด'}
              </button>
            )
          })}
          {search.product !== undefined && (
            <span className="ml-auto flex h-10 items-center gap-2 rounded-full bg-petrol-100 pr-1.5 pl-4 text-[15px] font-medium text-petrol-600">
              เฉพาะ {product?.name ?? 'สินค้าที่เลือก'}
              <button
                type="button"
                aria-label="ดูทุกสินค้า"
                onClick={() => {
                  setSearch({ ...search, product: undefined, offset: undefined })
                }}
                className="flex size-7 items-center justify-center rounded-full hover:bg-white"
              >
                <XIcon className="size-4" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>

        <div className="grid h-9 min-w-[1080px] grid-cols-[110px_minmax(0,1.2fr)_110px_90px_90px_150px_minmax(0,1fr)_90px] items-center gap-3 px-4 text-[13px] font-medium text-sand-800">
          <span>เวลา</span>
          <span>สินค้า</span>
          <span>ประเภท</span>
          <span className="text-right">ในคลัง</span>
          <span className="text-right">จอง</span>
          <span className="text-right">คงเหลือหลังจากนั้น</span>
          <span>อ้างอิง</span>
          <span>โดย</span>
        </div>

        {isPending && <p className="px-4 py-8 text-sand-800">กำลังโหลด...</p>}
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
                className="grid min-h-14 min-w-[1080px] grid-cols-[110px_minmax(0,1.2fr)_110px_90px_90px_150px_minmax(0,1fr)_90px] items-center gap-3 border-b border-sand-200 px-4 py-2.5 last:border-b-0"
              >
                <span className="text-[13px] text-sand-800">{formatDateTime(m.created_at)}</span>
                <span className="flex min-w-0 flex-col">
                  <Link
                    to="/stock"
                    search={{ product: m.product_id }}
                    className="truncate font-semibold hover:text-petrol-600 hover:underline"
                  >
                    {m.product_name}
                  </Link>
                  <span className="text-xs text-sand-800">{m.sku}</span>
                </span>
                <span>
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                </span>
                <span
                  className={cn('text-right font-medium', m.qty_change === 0 && 'text-sand-600')}
                >
                  {formatSigned(m.qty_change)}
                </span>
                <span
                  className={cn(
                    'text-right font-medium',
                    m.reserved_change === 0 && 'text-sand-600',
                  )}
                >
                  {formatSigned(m.reserved_change)}
                </span>
                <span className="text-right text-sm">
                  มี {m.on_hand_after} ·{' '}
                  <span className="font-bold">ขายได้ {m.available_after}</span>
                </span>
                <span className="flex min-w-0 flex-col text-sm">
                  {m.order_id !== null && m.order_no ? (
                    <Link
                      to="/orders/$orderId"
                      params={{ orderId: m.order_id }}
                      className="font-semibold hover:text-petrol-600 hover:underline"
                    >
                      {m.order_no}
                      {m.order_channel && (
                        <span className="font-normal text-sand-800">
                          {' '}
                          · {channelLabel[m.order_channel]}
                        </span>
                      )}
                    </Link>
                  ) : (
                    reason && <span className="font-medium">{reason}</span>
                  )}
                  {m.note && <span className="truncate text-sand-800">{m.note}</span>}
                </span>
                <span className="truncate text-sm text-sand-800">{m.created_by_name ?? '-'}</span>
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

import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { SearchIcon, StoreIcon } from 'lucide-react'

import { ChannelChip, Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { Pager } from '@/components/pager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { OrderStatus } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { orderStatusChip } from '@/lib/labels'
import { ordersQueryOptions } from '@/lib/queries'

const PAGE = 20
const STATUSES: OrderStatus[] = ['reserved', 'packed', 'shipped', 'canceled']

interface OrdersSearch {
  status?: OrderStatus
  q?: string
  offset?: number
}

export const Route = createFileRoute('/_app/orders/')({
  validateSearch: (search: Record<string, unknown>): OrdersSearch => ({
    status: STATUSES.includes(search.status as OrderStatus)
      ? (search.status as OrderStatus)
      : undefined,
    q: typeof search.q === 'string' && search.q !== '' ? search.q : undefined,
    offset: Number(search.offset) > 0 ? Number(search.offset) : undefined,
  }),
  component: OrdersPage,
})

function OrdersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const offset = search.offset ?? 0
  const { data, isPending } = useQuery(
    ordersQueryOptions({ status: search.status, q: search.q, limit: PAGE, offset }),
  )

  const setSearch = (next: OrdersSearch) => {
    void navigate({ search: next, replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[30px] leading-[42px] font-bold">ออเดอร์</h1>
          <p className="text-base text-sand-800">
            ทุกช่องทางใช้สต็อกกองเดียวกัน ออเดอร์จองของไว้จนกว่าจะส่งหรือยกเลิก
          </p>
        </div>
        <Button asChild>
          <Link to="/orders/new">
            <StoreIcon aria-hidden="true" />
            ขายหน้าร้าน
          </Link>
        </Button>
      </div>

      <section
        aria-label="รายการออเดอร์"
        className="overflow-x-auto rounded-[22px] bg-white p-3 shadow-soft"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 pt-2 pb-4">
          <div role="group" aria-label="สถานะออเดอร์" className="flex flex-wrap gap-2">
            {[undefined, ...STATUSES].map((status) => {
              const active = search.status === status
              return (
                <button
                  key={status ?? 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setSearch({ ...search, status, offset: undefined })
                  }}
                  className={cn(
                    'h-10 rounded-full px-4 text-[15px] font-medium',
                    active
                      ? 'bg-ink text-white'
                      : 'bg-sand-100 text-sand-800 hover:bg-sand-200 hover:text-ink',
                  )}
                >
                  {status ? orderStatusChip[status].label : 'ทั้งหมด'}
                </button>
              )
            })}
          </div>
          <label className="relative flex items-center">
            <SearchIcon
              className="pointer-events-none absolute left-3 size-4 text-sand-700"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="ค้นหาเลขออเดอร์"
              placeholder="ค้นหาเลขออเดอร์"
              defaultValue={search.q ?? ''}
              onChange={(e) => {
                setSearch({ ...search, q: e.target.value || undefined, offset: undefined })
              }}
              className="h-10 w-64 pl-9"
            />
          </label>
        </div>

        <div className="grid h-9 min-w-[920px] grid-cols-[170px_120px_90px_130px_120px_minmax(0,1fr)_120px] items-center gap-4 px-4 text-[13px] font-medium text-sand-800">
          <span>เลขออเดอร์</span>
          <span>ช่องทาง</span>
          <span className="text-right">จำนวน</span>
          <span className="text-right">ยอดรวม</span>
          <span>สถานะ</span>
          <span>สร้างโดย</span>
          <span className="text-right">เวลา</span>
        </div>

        {isPending && <p className="px-4 py-8 text-sand-800">กำลังโหลด...</p>}
        {data?.items.length === 0 && (
          <EmptyState
            title={search.status || search.q ? 'ไม่มีออเดอร์ที่ตรงกับตัวกรอง' : 'ยังไม่มีออเดอร์'}
            body={
              search.status || search.q
                ? 'ลองเลือกสถานะอื่น หรือล้างคำค้นหา'
                : 'ขายหน้าร้านได้เลย ระบบจะจองของให้ทันทีที่บันทึก'
            }
          />
        )}
        <ul className="flex flex-col gap-1">
          {data?.items.map((o) => {
            const chip = orderStatusChip[o.status]
            return (
              <li key={o.id}>
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="grid min-h-14 min-w-[920px] grid-cols-[170px_120px_90px_130px_120px_minmax(0,1fr)_120px] items-center gap-4 rounded-2xl px-4 py-2.5 hover:bg-sand-50"
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{o.order_no}</span>
                    {o.external_ref && (
                      <span className="text-xs text-sand-800">{o.external_ref}</span>
                    )}
                  </span>
                  <span>
                    <ChannelChip channel={o.channel} />
                  </span>
                  <span className="text-right">{o.item_count} ชิ้น</span>
                  <span className="text-right font-semibold">{formatMoney(o.total)}</span>
                  <span>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </span>
                  <span className="truncate text-sand-800">{o.created_by_name ?? '-'}</span>
                  <span className="text-right text-[13px] text-sand-800">
                    {formatDateTime(o.created_at)}
                  </span>
                </Link>
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

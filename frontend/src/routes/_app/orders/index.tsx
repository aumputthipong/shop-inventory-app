import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { InboxIcon, StoreIcon } from 'lucide-react'

import { ChannelChip, Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { SearchInput } from '@/components/search-input'
import { Segmented } from '@/components/segmented'
import { Button } from '@/components/ui/button'
import type { Channel, OrderStatus, OrderSummary } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { channelLabel, orderStatusChip } from '@/lib/labels'
import { ordersQueryOptions } from '@/lib/queries'
import { parseOffset } from '@/lib/search-params'

const PAGE = 20
const STATUSES: OrderStatus[] = ['reserved', 'packed', 'shipped', 'canceled']
const CHANNELS: Channel[] = ['store', 'shopee', 'line']
const COLUMNS =
  'grid-cols-[170px_minmax(0,1fr)_110px_80px_110px_100px_110px] items-center gap-4 px-4'

interface OrdersSearch {
  status?: OrderStatus
  channel?: Channel
  q?: string
  offset?: number
}

export const Route = createFileRoute('/_app/orders/')({
  validateSearch: (search: Record<string, unknown>): OrdersSearch => ({
    status: STATUSES.includes(search.status as OrderStatus)
      ? (search.status as OrderStatus)
      : undefined,
    channel: CHANNELS.includes(search.channel as Channel) ? (search.channel as Channel) : undefined,
    q: typeof search.q === 'string' && search.q !== '' ? search.q : undefined,
    offset: parseOffset(search.offset),
  }),
  component: OrdersPage,
})

function OrdersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const offset = search.offset ?? 0
  const { data, isPending } = useQuery(
    ordersQueryOptions({
      status: search.status,
      channel: search.channel,
      q: search.q,
      limit: PAGE,
      offset,
    }),
  )
  const counts = data?.status_counts
  const filtered = search.status ?? search.channel ?? search.q

  const setSearch = (next: OrdersSearch) => {
    void navigate({ search: next, replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ออเดอร์"
        actions={
          <div className="flex flex-wrap justify-end gap-2.5">
            <Button asChild variant="outline">
              <Link to="/orders/online">
                <InboxIcon aria-hidden="true" />
                คีย์ออเดอร์ออนไลน์
              </Link>
            </Button>
            <Button asChild>
              <Link to="/orders/new">
                <StoreIcon aria-hidden="true" />
                ขายหน้าร้าน
              </Link>
            </Button>
          </div>
        }
      />

      <section aria-label="รายการออเดอร์" className="panel overflow-x-auto">
        <div className="flex min-w-[920px] flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-4 pt-2">
          <FilterTabs
            label="สถานะออเดอร์"
            value={search.status}
            onChange={(status) => {
              setSearch({ ...search, status, offset: undefined })
            }}
            options={[
              {
                value: undefined,
                label: 'ทั้งหมด',
                count: counts && STATUSES.reduce((sum, st) => sum + counts[st], 0),
              },
              ...STATUSES.map((status) => ({
                value: status,
                label: orderStatusChip[status].label,
                count: counts?.[status],
              })),
            ]}
          />
          <div className="mb-2 flex items-center gap-3">
            <Segmented
              label="ช่องทาง"
              value={search.channel ?? 'all'}
              onChange={(channel) => {
                setSearch({
                  ...search,
                  channel: channel === 'all' ? undefined : channel,
                  offset: undefined,
                })
              }}
              options={[
                { value: 'all', label: 'ทุกช่องทาง' },
                ...CHANNELS.map((c) => ({ value: c, label: channelLabel[c] })),
              ]}
            />
            <SearchInput
              aria-label="ค้นหาออเดอร์"
              placeholder="เลขออเดอร์ ชื่อ หรือเบอร์ลูกค้า"
              defaultValue={search.q ?? ''}
              onChange={(e) => {
                setSearch({ ...search, q: e.target.value || undefined, offset: undefined })
              }}
              inputClassName="h-8 w-64"
            />
          </div>
        </div>

        <div
          className={cn(
            'grid h-9 min-w-[920px] border-b border-line text-[13px] text-ink-2',
            COLUMNS,
          )}
        >
          <span>เลขออเดอร์</span>
          <span>ลูกค้า</span>
          <span>ช่องทาง</span>
          <span className="text-right">จำนวน</span>
          <span className="text-right">ยอดรวม</span>
          <span>สถานะ</span>
          <span className="text-right">เวลา</span>
        </div>

        {isPending && <p className="px-4 py-8 text-[13px] text-ink-2">กำลังโหลด...</p>}
        {data?.items.length === 0 && (
          <EmptyState
            title={filtered ? 'ไม่มีออเดอร์ที่ตรงกับตัวกรอง' : 'ยังไม่มีออเดอร์'}
            body={
              filtered
                ? 'ลองเลือกสถานะหรือช่องทางอื่น หรือล้างคำค้นหา'
                : 'ขายหน้าร้านได้เลย ระบบจะจองของให้ทันทีที่บันทึก'
            }
          />
        )}
        <ul>
          {data?.items.map((o) => {
            const chip = orderStatusChip[o.status]
            return (
              <li key={o.id} className="border-b border-line last:border-b-0">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className={cn('grid min-h-14 min-w-[920px] py-2.5 hover:bg-surface-2', COLUMNS)}
                >
                  <span className="flex flex-col">
                    <span className="code font-medium">{o.order_no}</span>
                    {o.external_ref && (
                      <span className="code text-xs text-ink-3">{o.external_ref}</span>
                    )}
                  </span>
                  <CustomerCell order={o} />
                  <span>
                    <ChannelChip channel={o.channel} />
                  </span>
                  <span className="text-right">{o.item_count} ชิ้น</span>
                  <span className="text-right font-medium">{formatMoney(o.total)}</span>
                  <span>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </span>
                  <span className="text-right text-[13px] text-ink-3">
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

function CustomerCell({ order: o }: { order: OrderSummary }) {
  const picks = o.lines.map((l) => `${l.name} ×${l.qty}`).join(', ')
  return (
    <span className="flex min-w-0 flex-col">
      {o.customer_name ? (
        <span className="truncate">{o.customer_name}</span>
      ) : (
        <span className="truncate text-ink-3">
          {o.channel === 'store' ? 'ลูกค้าหน้าร้าน' : 'ไม่ได้ใส่ชื่อ'}
        </span>
      )}
      <span className="truncate text-xs text-ink-3">{picks}</span>
    </span>
  )
}

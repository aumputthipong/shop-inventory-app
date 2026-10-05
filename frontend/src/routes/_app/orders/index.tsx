import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { InboxIcon, StoreIcon } from 'lucide-react'

import { ChannelChip, Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { HelpNote } from '@/components/help-note'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import type { OrderStatus } from '@/lib/api'
import { formatDateTime, formatMoney } from '@/lib/format'
import { orderStatusChip } from '@/lib/labels'
import { ordersQueryOptions } from '@/lib/queries'
import { parseOffset } from '@/lib/search-params'

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
    offset: parseOffset(search.offset),
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
      <PageHeader
        title="ออเดอร์"
        description="ทุกช่องทางใช้สต็อกกองเดียวกัน ออเดอร์จองของไว้จนกว่าจะส่งหรือยกเลิก"
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
      >
        <HelpNote question="สถานะออเดอร์แต่ละแบบหมายถึงอะไร" className="mt-2 max-w-2xl">
          <p>
            <span className="font-medium text-ink">รอดำเนินการ</span> บันทึกออเดอร์แล้ว
            ของถูกกันไว้ให้ลูกค้าคนนี้ ยังอยู่ในคลัง
          </p>
          <p>
            <span className="font-medium text-ink">แพ็กแล้ว</span> ห่อของเสร็จ รอส่ง
            ของยังนับว่าอยู่ในคลัง
          </p>
          <p>
            <span className="font-medium text-ink">ส่งแล้ว</span> ของออกจากร้าน ระบบตัดออกจากคลังให้
            ขายหน้าร้านที่ลูกค้ารับของไปเลยจะเป็นสถานะนี้ทันที
          </p>
          <p>
            <span className="font-medium text-ink">ยกเลิก</span> คืนของที่จองไว้กลับมาขายได้ทันที
          </p>
        </HelpNote>
      </PageHeader>

      <section aria-label="รายการออเดอร์" className="panel overflow-x-auto">
        <div className="flex min-w-[920px] flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-line px-4 pt-2">
          <FilterTabs
            label="สถานะออเดอร์"
            value={search.status}
            onChange={(status) => {
              setSearch({ ...search, status, offset: undefined })
            }}
            options={[
              { value: undefined, label: 'ทั้งหมด' },
              ...STATUSES.map((status) => ({
                value: status,
                label: orderStatusChip[status].label,
              })),
            ]}
          />
          <SearchInput
            className="mb-2"
            aria-label="ค้นหาเลขออเดอร์"
            placeholder="ค้นหาเลขออเดอร์"
            defaultValue={search.q ?? ''}
            onChange={(e) => {
              setSearch({ ...search, q: e.target.value || undefined, offset: undefined })
            }}
            inputClassName="h-8 w-60"
          />
        </div>

        <div className="grid h-9 min-w-[920px] grid-cols-[170px_120px_90px_130px_120px_minmax(0,1fr)_120px] items-center gap-4 border-b border-line px-4 text-[13px] text-ink-2">
          <span>เลขออเดอร์</span>
          <span>ช่องทาง</span>
          <span className="text-right">จำนวน</span>
          <span className="text-right">ยอดรวม</span>
          <span>สถานะ</span>
          <span>สร้างโดย</span>
          <span className="text-right">เวลา</span>
        </div>

        {isPending && <p className="px-4 py-8 text-[13px] text-ink-2">กำลังโหลด...</p>}
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
        <ul>
          {data?.items.map((o) => {
            const chip = orderStatusChip[o.status]
            return (
              <li key={o.id} className="border-b border-line last:border-b-0">
                <Link
                  to="/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="grid min-h-14 min-w-[920px] grid-cols-[170px_120px_90px_130px_120px_minmax(0,1fr)_120px] items-center gap-4 px-4 py-2.5 hover:bg-surface-2"
                >
                  <span className="flex flex-col">
                    <span className="code font-medium">{o.order_no}</span>
                    {o.external_ref && (
                      <span className="code text-xs text-ink-3">{o.external_ref}</span>
                    )}
                  </span>
                  <span>
                    <ChannelChip channel={o.channel} />
                  </span>
                  <span className="text-right">{o.item_count} ชิ้น</span>
                  <span className="text-right font-medium">{formatMoney(o.total)}</span>
                  <span>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </span>
                  <span className="truncate text-ink-2">{o.created_by_name ?? '-'}</span>
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

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import { ClipboardCheckIcon, InboxIcon, PackagePlusIcon, StoreIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { LineChatButton } from '@/components/line-chat-button'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import type { DaySales, OrderStatus, OrderSummary } from '@/lib/api'
import { formatDateTime, formatMoney, formatSigned, formatWaiting, hoursSince } from '@/lib/format'
import { channelDot, channelLabel, movementChip } from '@/lib/labels'
import {
  countsQueryOptions,
  movementsQueryOptions,
  ordersQueryOptions,
  productsQueryOptions,
  todaySalesQueryOptions,
} from '@/lib/queries'
import { useLineChatUrl } from '@/lib/use-line-chat-url'

const PREVIEW = 5
const LONG_WAIT_HOURS = 48

const longDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export function TodayBoard({ isOwner }: { isOwner: boolean }) {
  const toPack = useQuery(
    ordersQueryOptions({ status: 'reserved', sort: 'oldest', limit: PREVIEW }),
  )
  const toShip = useQuery(ordersQueryOptions({ status: 'packed', sort: 'oldest', limit: PREVIEW }))
  const sales = useQuery({ ...todaySalesQueryOptions, enabled: isOwner })
  const products = useQuery(productsQueryOptions)
  const moves = useQuery(movementsQueryOptions({ limit: PREVIEW }))
  const lineChatUrl = useLineChatUrl()
  const counts = useQuery({
    ...countsQueryOptions({ status: 'submitted', limit: 1 }),
    enabled: isOwner,
  })

  const restock = (products.data ?? [])
    .filter((p) => p.is_active && p.stock_status !== 'in_stock')
    .sort((a, b) => a.available - b.available)
  const pendingCounts = counts.data?.total ?? 0
  const loaded = toPack.data && toShip.data && products.data && (!isOwner || counts.data)
  const nothingToDo =
    loaded &&
    toPack.data.total === 0 &&
    toShip.data.total === 0 &&
    restock.length === 0 &&
    pendingCounts === 0

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="งานวันนี้"
        aside={longDate.format(new Date())}
        description={nothingToDo ? 'ไม่มีงานค้าง ออเดอร์ส่งครบ และของทุกรายการยังพอขาย' : undefined}
        actions={
          <nav aria-label="ทางลัด" className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/orders/new">
                <StoreIcon aria-hidden="true" />
                ขายหน้าร้าน
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/orders/online">
                <InboxIcon aria-hidden="true" />
                คีย์ออเดอร์ออนไลน์
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/receive">
                <PackagePlusIcon aria-hidden="true" />
                รับของเข้า
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/counts/new">
                <ClipboardCheckIcon aria-hidden="true" />
                นับสต็อก
              </Link>
            </Button>
            {lineChatUrl && <LineChatButton url={lineChatUrl} />}
          </nav>
        }
      />

      {isOwner && <SalesStrip sales={sales.data} />}

      {isOwner && pendingCounts > 0 && (
        <section
          aria-label="ผลนับรอยืนยัน"
          className="panel flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
        >
          <span aria-label={`ผลนับรอยืนยัน ${pendingCounts}`} className="count text-[34px]">
            {pendingCounts}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-base font-semibold">ผลนับรอยืนยัน</h2>
            <span className="text-[13px] text-ink-2">
              พนักงานส่งผลนับมาแล้ว สต็อกจะเปลี่ยนเมื่อคุณยืนยัน
            </span>
          </span>
          <Button asChild variant="outline">
            <Link to="/counts" search={{ status: 'submitted' }}>
              ตรวจผลนับ
            </Link>
          </Button>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OrderLane
          title="ต้องแพ็ก"
          hint="จองของไว้แล้ว รอห่อ"
          status="reserved"
          total={toPack.data?.total}
          orders={toPack.data?.items}
        />
        <OrderLane
          title="รอส่ง"
          hint="แพ็กแล้ว รอส่งให้ขนส่งหรือลูกค้า"
          status="packed"
          total={toShip.data?.total}
          orders={toShip.data?.items}
        />

        <Section
          title="ของใกล้หมด"
          hint="ควรสั่งเพิ่มหรือรับของเข้า"
          total={products.data ? restock.length : undefined}
          more={
            restock.length > PREVIEW && (
              <Link to="/stock" className="text-petrol-600 hover:underline">
                ดูสต็อกทั้งหมด
              </Link>
            )
          }
        >
          {restock.length === 0 ? (
            <Empty>ทุกรายการยังมีของพอขาย</Empty>
          ) : (
            restock.slice(0, PREVIEW).map((p) => {
              const left = Math.max(p.available, 0)
              return (
                <Row key={p.id}>
                  <Link
                    to="/stock"
                    search={{ product: p.id }}
                    className="min-w-0 flex-1 truncate font-medium hover:text-petrol-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <Chip tone={left === 0 ? 'bad' : 'warn'}>
                    {left === 0 ? 'หมดแล้ว' : `เหลือ ${left} ชิ้น`}
                  </Chip>
                </Row>
              )
            })
          )}
        </Section>

        <Section
          title="ความเคลื่อนไหวล่าสุด"
          hint="รับเข้า จอง ส่งออก และปรับยอด จากทุกคนในร้าน"
          counted={false}
          more={
            (moves.data?.total ?? 0) > PREVIEW && (
              <Link to="/ledger" className="text-petrol-600 hover:underline">
                ดูประวัติสต็อกทั้งหมด
              </Link>
            )
          }
        >
          {moves.data?.items.length === 0 ? (
            <Empty>ยังไม่มีความเคลื่อนไหว</Empty>
          ) : (
            moves.data?.items.map((m) => {
              const chip = movementChip[m.type]
              return (
                <Row key={m.id}>
                  <Chip tone={chip.tone} className="w-[72px] justify-center">
                    {chip.label}
                  </Chip>
                  <span className="min-w-0 flex-1 truncate">{m.product_name}</span>
                  <span className="w-10 text-right font-medium">
                    {formatSigned(m.qty_change !== 0 ? m.qty_change : m.reserved_change)}
                  </span>
                  <span className="hidden w-24 text-right text-[13px] text-ink-2 sm:inline">
                    {formatDateTime(m.created_at)}
                  </span>
                </Row>
              )
            })
          )}
        </Section>
      </div>
    </div>
  )
}

function SalesStrip({ sales }: { sales: DaySales | undefined }) {
  return (
    <section
      aria-label="ขายวันนี้"
      className="panel grid grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]"
    >
      <div className="col-span-2 flex flex-col px-5 py-4 lg:col-span-1">
        <span className="text-[13px] text-ink-2">ขายวันนี้</span>
        <span className="text-[22px] leading-[30px] font-semibold">
          {sales ? formatMoney(sales.revenue) : '-'}
        </span>
        <span className="text-[13px] text-ink-2">
          {sales ? `จาก ${sales.orders} ออเดอร์ ไม่นับที่ยกเลิก` : 'กำลังโหลด'}
        </span>
      </div>
      {sales?.channels.map((c) => (
        <Stat
          key={c.channel}
          label={
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn('size-1.5 rounded-full', channelDot[c.channel])}
              />
              {channelLabel[c.channel]}
            </span>
          }
          value={formatMoney(c.revenue)}
          note={`${c.orders} ออเดอร์`}
        />
      ))}
      <Stat
        label="ส่งออกวันนี้"
        value={sales ? `${sales.shipped} ออเดอร์` : '-'}
        note="ของออกจากร้านแล้ว"
      />
    </section>
  )
}

function Stat({ label, value, note }: { label: ReactNode; value: string; note: string }) {
  return (
    <div className="flex flex-col border-t border-line px-5 py-4 lg:border-t-0 lg:border-l">
      <span className="text-[13px] text-ink-2">{label}</span>
      <span className="text-base font-semibold">{value}</span>
      <span className="text-[13px] text-ink-2">{note}</span>
    </div>
  )
}

function OrderLane({
  title,
  hint,
  status,
  total,
  orders,
}: {
  title: string
  hint: string
  status: OrderStatus
  total: number | undefined
  orders: OrderSummary[] | undefined
}) {
  return (
    <Section
      title={title}
      hint={hint}
      total={total}
      more={
        (total ?? 0) > 0 && (
          <Link to="/orders" search={{ status }} className="text-petrol-600 hover:underline">
            ดูทั้งหมด {total} ออเดอร์
          </Link>
        )
      }
    >
      {orders?.length === 0 ? (
        <Empty>ไม่มีออเดอร์ค้าง</Empty>
      ) : (
        orders?.map((o) => {
          const hours = hoursSince(o.created_at)
          return (
            <Row key={o.id}>
              <Link
                to="/orders/$orderId"
                params={{ orderId: o.id }}
                className="code min-w-0 flex-1 truncate hover:text-petrol-600 hover:underline"
              >
                {o.order_no}
              </Link>
              <ChannelChip channel={o.channel} />
              <span className="w-12 text-right text-sm text-ink-2">{o.item_count} ชิ้น</span>
              <span className="flex w-24 justify-end" title={formatDateTime(o.created_at)}>
                {hours >= LONG_WAIT_HOURS ? (
                  <Chip tone="warn">{formatWaiting(hours)}</Chip>
                ) : (
                  <span className="text-[13px] text-ink-2">{formatWaiting(hours)}</span>
                )}
              </span>
            </Row>
          )
        })
      )}
    </Section>
  )
}

function Section({
  title,
  hint,
  counted = true,
  total,
  more,
  children,
}: {
  title: string
  hint: string
  counted?: boolean
  total?: number
  more?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="panel flex flex-col">
      <header className="flex min-h-20 items-center gap-4 border-b border-line px-5 py-3">
        {counted && (
          <span
            aria-label={`${title} ${total ?? 0}`}
            className={cn(
              'count min-w-8 shrink-0 text-center text-5xl',
              !total && 'text-line-strong',
            )}
          >
            {total ?? '-'}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-[13px] text-ink-2">{hint}</span>
        </span>
      </header>
      <ul className="flex flex-1 flex-col px-5 py-1">{children}</ul>
      {more && (
        <footer className="border-t border-line px-5 py-2.5 text-[13px] font-medium">{more}</footer>
      )}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-h-11 items-center gap-3 border-b border-line py-2 last:border-b-0">
      {children}
    </li>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="py-4 text-[13px] text-ink-2">{children}</li>
}

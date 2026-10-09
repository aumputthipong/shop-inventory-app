import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import {
  ClipboardCheckIcon,
  InboxIcon,
  type LucideIcon,
  PackageCheckIcon,
  PackagePlusIcon,
  StoreIcon,
  TruckIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { LineChatButton } from '@/components/line-chat-button'
import { PageHeader } from '@/components/page-header'
import { StockInDialog } from '@/components/stock/stock-in-dialog'
import { Button } from '@/components/ui/button'
import {
  api,
  isApiError,
  type DaySales,
  type OrderStatus,
  type OrderSummary,
  type Product,
} from '@/lib/api'
import { formatDateTime, formatMoney, formatWaiting, hoursSince } from '@/lib/format'
import { channelIcon, channelLabel } from '@/lib/labels'
import {
  countsQueryOptions,
  invalidateStock,
  ordersQueryOptions,
  productsQueryOptions,
  todaySalesQueryOptions,
} from '@/lib/queries'
import { useToast } from '@/lib/toast'
import { useLineChatUrl } from '@/lib/use-line-chat-url'

const PREVIEW = 5
const LATE_HOURS = 24
const OVERDUE_HOURS = 72

const longDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const laneAction = {
  reserved: { action: 'pack', label: 'แพ็กแล้ว', done: 'แพ็กเรียบร้อย', icon: PackageCheckIcon },
  packed: { action: 'ship', label: 'ส่งแล้ว', done: 'ส่งแล้ว', icon: TruckIcon },
} as const

export function TodayBoard({ isOwner }: { isOwner: boolean }) {
  const toPack = useQuery(
    ordersQueryOptions({ status: 'reserved', sort: 'oldest', limit: PREVIEW }),
  )
  const toShip = useQuery(ordersQueryOptions({ status: 'packed', sort: 'oldest', limit: PREVIEW }))
  const sales = useQuery({ ...todaySalesQueryOptions, enabled: isOwner })
  const products = useQuery(productsQueryOptions)
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
        below={isOwner && <SalesStrip sales={sales.data} />}
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
                เริ่มตรวจนับ
              </Link>
            </Button>
            {lineChatUrl && <LineChatButton url={lineChatUrl} label="ลองสั่งแบบลูกค้าทาง LINE" />}
          </nav>
        }
      />

      {isOwner && pendingCounts > 0 && (
        <section
          aria-label="ผลนับรอยืนยัน"
          className="panel flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4"
        >
          <span
            aria-label={`ผลนับรอยืนยัน ${pendingCounts}`}
            className="count px-1 text-[34px] highlight"
          >
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

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <OrderLane
          title="ต้องแพ็ก"
          status="reserved"
          total={toPack.data?.total}
          orders={toPack.data?.items}
        />
        <div className="flex flex-col gap-4">
          <OrderLane
            title="รอส่ง"
            status="packed"
            total={toShip.data?.total}
            orders={toShip.data?.items}
          />
          <Restock products={products.data ? restock : undefined} />
        </div>
      </div>
    </div>
  )
}

function SalesStrip({ sales }: { sales: DaySales | undefined }) {
  const quiet = sales?.orders === 0 && sales.shipped === 0
  return (
    <section
      aria-label="ขายวันนี้"
      className="mt-4 flex flex-wrap items-baseline gap-x-10 gap-y-3 border-t border-white/25 pt-3"
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-ink-2">ขายวันนี้</span>
        <span className="text-[22px] leading-[30px] font-semibold">
          {sales ? formatMoney(sales.revenue) : '-'}
        </span>
        <span className="text-[13px] text-ink-2">
          {!sales
            ? 'กำลังโหลด'
            : quiet
              ? 'ยังไม่มีออเดอร์วันนี้'
              : `จาก ${sales.orders} ออเดอร์ ไม่นับที่ยกเลิก`}
        </span>
      </p>
      {sales && !quiet && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 lg:ml-auto">
          {sales.channels.map((c) => (
            <Figure
              key={c.channel}
              icon={channelIcon[c.channel].icon}
              label={channelLabel[c.channel]}
              value={formatMoney(c.revenue)}
              muted={c.orders === 0}
            />
          ))}
          <Figure
            icon={TruckIcon}
            label="ส่งออกแล้ว"
            value={`${sales.shipped} ออเดอร์`}
            muted={sales.shipped === 0}
          />
        </dl>
      )}
    </section>
  )
}

function Figure({
  icon: Icon,
  label,
  value,
  muted,
}: {
  icon: LucideIcon
  label: string
  value: string
  muted: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="flex items-center gap-1.5 text-ink-2">
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </dt>
      <dd className={cn('font-medium', muted && 'font-normal text-ink-3')}>{value}</dd>
    </div>
  )
}

function OrderLane({
  title,
  status,
  total,
  orders,
}: {
  title: string
  status: 'reserved' | 'packed'
  total: number | undefined
  orders: OrderSummary[] | undefined
}) {
  return (
    <Section
      title={title}
      total={total}
      more={
        (total ?? 0) > PREVIEW && (
          <MoreLink to="/orders" search={{ status }}>
            ดูทั้งหมด {total} ออเดอร์
          </MoreLink>
        )
      }
    >
      {orders?.length === 0 ? (
        <Empty>ไม่มีออเดอร์ค้าง</Empty>
      ) : (
        orders?.map((o) => <OrderRow key={o.id} order={o} status={status} />)
      )}
    </Section>
  )
}

function OrderRow({ order: o, status }: { order: OrderSummary; status: 'reserved' | 'packed' }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const step = laneAction[status]
  const act = useMutation({
    mutationFn: () => api.orderAction(o.id, step.action),
    onSuccess: async () => {
      toast(`${o.order_no} ${step.done}`)
      await invalidateStock(queryClient)
    },
    onError: async (error) => {
      if (isApiError(error, 'invalid_state')) await invalidateStock(queryClient)
    },
  })
  const hours = hoursSince(o.created_at)
  const picks = o.lines.map((l) => `${l.name} ×${l.qty}`).join(', ')

  return (
    <Row>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-3">
          <Link
            to="/orders/$orderId"
            params={{ orderId: o.id }}
            className="code min-w-0 truncate hover:text-brand-600 hover:underline"
          >
            {o.order_no}
          </Link>
          <ChannelChip channel={o.channel} />
          <span
            title={formatDateTime(o.created_at)}
            className={cn(
              'ml-auto text-[13px] whitespace-nowrap',
              hours >= OVERDUE_HOURS
                ? 'font-medium text-chip-bad-fg'
                : hours >= LATE_HOURS
                  ? 'font-medium text-chip-warn-fg'
                  : 'text-ink-3',
            )}
          >
            {formatWaiting(hours)}
          </span>
        </div>
        <p className="truncate text-[13px] text-ink-2">
          {o.customer_name && <span className="mr-2 font-medium text-ink">{o.customer_name}</span>}
          {picks}
        </p>
        {act.isError && (
          <p role="alert" className="text-[13px] text-chip-bad-fg">
            {isApiError(act.error, 'invalid_state')
              ? 'ออเดอร์นี้เพิ่งเปลี่ยนสถานะจากเครื่องอื่น'
              : 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง'}
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        disabled={act.isPending}
        aria-label={`${step.label} ${o.order_no}`}
        onClick={() => {
          act.mutate()
        }}
      >
        <step.icon aria-hidden="true" />
        {step.label}
      </Button>
    </Row>
  )
}

function Restock({ products }: { products: Product[] | undefined }) {
  const [receiving, setReceiving] = useState<Product | null>(null)
  return (
    <Section
      title="ของใกล้หมด"
      total={products?.length}
      more={(products?.length ?? 0) > PREVIEW && <MoreLink to="/stock">ดูสต็อกทั้งหมด</MoreLink>}
    >
      {products?.length === 0 ? (
        <Empty>ทุกรายการยังมีของพอขาย</Empty>
      ) : (
        products?.slice(0, PREVIEW).map((p) => {
          const left = Math.max(p.available, 0)
          return (
            <Row key={p.id}>
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <Link
                  to="/stock"
                  search={{ product: p.id }}
                  className="max-w-full truncate font-medium hover:text-brand-600 hover:underline"
                >
                  {p.name}
                </Link>
                <Chip tone={left === 0 ? 'bad' : 'warn'}>
                  {left === 0 ? 'หมดแล้ว' : `เหลือ ${left} ชิ้น`}
                </Chip>
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-label={`รับของเข้า ${p.name}`}
                onClick={() => {
                  setReceiving(p)
                }}
              >
                <PackagePlusIcon aria-hidden="true" />
                รับของเข้า
              </Button>
            </Row>
          )
        })
      )}
      {receiving && (
        <StockInDialog
          product={receiving}
          open
          onOpenChange={(open) => {
            if (!open) setReceiving(null)
          }}
        />
      )}
    </Section>
  )
}

function MoreLink({
  to,
  search,
  children,
}: {
  to: '/orders' | '/stock'
  search?: { status: OrderStatus }
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      search={search}
      className="text-brand-600 underline decoration-line-strong underline-offset-4 hover:decoration-brand-600"
    >
      {children}
    </Link>
  )
}

function Section({
  title,
  total,
  more,
  children,
}: {
  title: string
  total?: number
  more?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="panel flex flex-col">
      <header className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span
          aria-label={`${title} ${total ?? 0}`}
          className={cn(
            'count min-w-8 shrink-0 px-1 text-center text-[34px]',
            total ? 'highlight' : 'text-line-strong',
          )}
        >
          {total ?? '-'}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </header>
      <ul className="flex flex-col px-5 py-1">{children}</ul>
      {more && (
        <footer className="border-t border-line px-5 py-2.5 text-[13px] font-medium">{more}</footer>
      )}
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return (
    <li className="flex min-h-14 items-center gap-4 border-b border-line py-3 last:border-b-0">
      {children}
    </li>
  )
}

function Empty({ children }: { children: ReactNode }) {
  return <li className="py-4 text-[13px] text-ink-2">{children}</li>
}

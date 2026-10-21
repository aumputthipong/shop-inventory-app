import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { cn } from 'cn'
import {
  ClipboardCheckIcon,
  InboxIcon,
  PackageCheckIcon,
  PackagePlusIcon,
  StoreIcon,
  TruckIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

import { ChannelChip, ChannelMark, OrderStatusText } from '@/components/chip'
import { LineChatButton } from '@/components/line-chat-button'
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
import {
  formatClock,
  formatDateTime,
  formatMoney,
  formatQueueTime,
  formatWaiting,
  hoursSince,
} from '@/lib/format'
import { channelLabel } from '@/lib/labels'
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

const longDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

const nextStep = {
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

  const restock = products.data
    ?.filter((p) => p.is_active && p.stock_status !== 'in_stock')
    .sort((a, b) => a.available - b.available)
  const queue =
    toPack.data && toShip.data
      ? [...toPack.data.items, ...toShip.data.items].sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        )
      : undefined
  const pendingCounts = counts.data?.total ?? 0
  const loaded = queue && restock && (!isOwner || counts.data)
  const nothingToDo = loaded && queue.length === 0 && restock.length === 0 && pendingCounts === 0

  return (
    <div className="flex flex-col gap-6">
      <Board
        toPack={toPack.data?.total}
        toShip={toShip.data?.total}
        low={restock?.length}
        calm={Boolean(nothingToDo)}
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

      {isOwner && <SalesLine sales={sales.data} />}

      {isOwner && pendingCounts > 0 && (
        <section
          aria-label="ผลนับรอยืนยัน"
          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line-strong pb-4"
        >
          <span aria-label={`ผลนับรอยืนยัน ${pendingCounts}`} className="figure text-2xl">
            {pendingCounts}
          </span>
          <p className="min-w-0 flex-1">
            <span className="font-semibold">ผลนับรอยืนยัน</span>
            <span className="ml-3 text-ink-2">
              พนักงานส่งผลนับมาแล้ว สต็อกจะเปลี่ยนเมื่อคุณยืนยัน
            </span>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/counts" search={{ status: 'submitted' }}>
              ตรวจผลนับ
            </Link>
          </Button>
        </section>
      )}

      <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_340px]">
        <Queue
          orders={queue}
          more={
            <>
              {(toPack.data?.total ?? 0) > PREVIEW && (
                <MoreLink to="/orders" search={{ status: 'reserved' }}>
                  ดูรอแพ็กทั้งหมด {toPack.data?.total} ออเดอร์
                </MoreLink>
              )}
              {(toShip.data?.total ?? 0) > PREVIEW && (
                <MoreLink to="/orders" search={{ status: 'packed' }}>
                  ดูรอส่งทั้งหมด {toShip.data?.total} ออเดอร์
                </MoreLink>
              )}
            </>
          }
        />
        <Restock products={restock} />
      </div>
    </div>
  )
}

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date())
    }, 30_000)
    return () => {
      clearInterval(id)
    }
  }, [])
  return now
}

function Board({
  toPack,
  toShip,
  low,
  calm,
  actions,
}: {
  toPack: number | undefined
  toShip: number | undefined
  low: number | undefined
  calm: boolean
  actions: ReactNode
}) {
  const now = useNow()
  return (
    <section aria-label="สรุปงานที่รออยู่" className="panel">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sheet-head px-6 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="page-title">งานวันนี้</h1>
          <span className="text-ink-2">{longDate.format(now)}</span>
        </div>
        {actions}
      </div>
      <div className="grid grid-cols-3 gap-x-6 gap-y-4 px-6 py-5 @3xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,148px))]">
        <div className="col-span-3 flex flex-col justify-end gap-1.5 @3xl:col-span-1">
          <time className="figure text-[40px]">{formatClock(now)}</time>
          {calm && (
            <span className="text-[13px] text-ink-2">
              ไม่มีงานค้าง ออเดอร์ส่งครบ ของทุกรายการยังพอขาย
            </span>
          )}
        </div>
        <BoardFigure label="รอแพ็ก" value={toPack} to="/orders" status="reserved" />
        <BoardFigure label="รอส่ง" value={toShip} to="/orders" status="packed" />
        <BoardFigure label="ของใกล้หมด" value={low} to="/stock" />
      </div>
    </section>
  )
}

function BoardFigure({
  label,
  value,
  to,
  status,
}: {
  label: string
  value: number | undefined
  to: '/orders' | '/stock'
  status?: OrderStatus
}) {
  return (
    <Link
      to={to}
      search={status ? { status } : undefined}
      aria-label={`${label} ${value ?? 0}`}
      className="group flex items-stretch gap-3"
    >
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0 rounded-[1px]', value ? 'bg-marker-500' : 'bg-line')}
      />
      <span className="flex flex-col justify-end gap-1.5">
        <span className={cn('figure text-[40px]', value ? 'text-brand-600' : 'text-ink-3')}>
          {value ?? '-'}
        </span>
        <span className="text-[13px] text-ink-2 group-hover:text-ink group-hover:underline">
          {label}
        </span>
      </span>
    </Link>
  )
}

function SalesLine({ sales }: { sales: DaySales | undefined }) {
  const quiet = sales?.orders === 0 && sales.shipped === 0
  return (
    <section
      aria-label="ขายวันนี้"
      className="-mt-2 flex flex-wrap items-baseline gap-x-10 gap-y-2"
    >
      <p className="flex flex-wrap items-baseline gap-x-3">
        <span className="text-ink-2">ขายวันนี้</span>
        <span className="text-xl font-semibold">{sales ? formatMoney(sales.revenue) : '-'}</span>
        <span className="text-[13px] text-ink-2">
          {!sales
            ? 'กำลังโหลด'
            : quiet
              ? 'ยังไม่มีออเดอร์วันนี้'
              : `จาก ${sales.orders} ออเดอร์ ไม่นับที่ยกเลิก`}
        </span>
      </p>
      {sales && !quiet && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 @4xl:ml-auto">
          {sales.channels.map((c) => (
            <div key={c.channel} className="flex items-center gap-2">
              <dt className="flex items-center gap-2 text-ink-2">
                <ChannelMark channel={c.channel} />
                {channelLabel[c.channel]}
              </dt>
              <dd className={cn('font-semibold', c.orders === 0 && 'font-normal text-ink-3')}>
                {formatMoney(c.revenue)}
              </dd>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <dt className="text-ink-2">ส่งออกแล้ว</dt>
            <dd className={cn('font-semibold', sales.shipped === 0 && 'font-normal text-ink-3')}>
              {sales.shipped} ออเดอร์
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}

const queueCols =
  '@2xl:grid-cols-[56px_148px_minmax(0,1fr)_64px_72px_104px] @2xl:items-baseline @2xl:gap-x-4'

function Queue({ orders, more }: { orders: OrderSummary[] | undefined; more: ReactNode }) {
  return (
    <Sheet title="คิวออเดอร์" meta="เรียงจากที่รอนานที่สุด" footer={more}>
      <div
        aria-hidden="true"
        className={cn(
          'hidden border-b border-line px-5 py-2 text-xs font-medium text-ink-2 @2xl:grid',
          queueCols,
        )}
      >
        <span>เวลาสั่ง</span>
        <span>ออเดอร์</span>
        <span>ลูกค้าและของที่ต้องหยิบ</span>
        <span>สถานะ</span>
        <span className="text-right">รอมาแล้ว</span>
        <span />
      </div>
      <ul>
        {orders?.length === 0 ? (
          <li className="px-5 py-6 text-ink-2">ไม่มีออเดอร์ค้าง</li>
        ) : (
          orders?.map((o) => <QueueRow key={o.id} order={o} />)
        )}
      </ul>
    </Sheet>
  )
}

function QueueRow({ order: o }: { order: OrderSummary }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const step = nextStep[o.status === 'packed' ? 'packed' : 'reserved']
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
  const late = hours >= LATE_HOURS
  const picks = o.lines.map((l) => `${l.name} ×${l.qty}`).join(', ')

  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b border-line px-5 py-3 last:border-b-0',
        queueCols,
      )}
    >
      <div className="flex items-baseline gap-3 @2xl:contents">
        <span title={formatDateTime(o.created_at)} className="font-semibold">
          {formatQueueTime(o.created_at)}
        </span>
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 @2xl:flex-col @2xl:items-start">
          <Link
            to="/orders/$orderId"
            params={{ orderId: o.id }}
            className="code min-w-0 truncate hover:text-brand-600 hover:underline"
          >
            {o.order_no}
          </Link>
          <ChannelChip channel={o.channel} className="text-[13px] text-ink-2" />
        </span>
      </div>
      <div className="col-start-1 row-start-2 min-w-0 @2xl:col-auto @2xl:row-auto">
        <p className="truncate">
          {o.customer_name ? (
            <span className="font-medium">{o.customer_name}</span>
          ) : (
            <span className="text-ink-2">ไม่ได้ใส่ชื่อ</span>
          )}
        </p>
        <p className="truncate text-[13px] text-ink-2">{picks}</p>
        {act.isError && (
          <p role="alert" className="text-[13px] text-late">
            {isApiError(act.error, 'invalid_state')
              ? 'ออเดอร์นี้เพิ่งเปลี่ยนสถานะจากเครื่องอื่น'
              : 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง'}
          </p>
        )}
      </div>
      <div className="col-start-1 row-start-3 flex gap-3 @2xl:contents">
        <OrderStatusText status={o.status} late={late} />
        <span className={cn('text-right font-semibold whitespace-nowrap', late && 'text-late')}>
          {formatWaiting(hours)}
        </span>
      </div>
      <div className="col-start-2 row-span-3 row-start-1 self-center @2xl:col-auto @2xl:row-auto @2xl:row-span-1 @2xl:flex @2xl:justify-end">
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
      </div>
    </li>
  )
}

function Restock({ products }: { products: Product[] | undefined }) {
  const [receiving, setReceiving] = useState<Product | null>(null)
  return (
    <Sheet
      title="ของใกล้หมด"
      meta="ขายได้อีก"
      footer={(products?.length ?? 0) > PREVIEW && <MoreLink to="/stock">ดูสต็อกทั้งหมด</MoreLink>}
    >
      <ul>
        {products?.length === 0 ? (
          <li className="px-5 py-6 text-ink-2">ทุกรายการยังมีของพอขาย</li>
        ) : (
          products?.slice(0, PREVIEW).map((p) => {
            const left = Math.max(p.available, 0)
            return (
              <li
                key={p.id}
                className="flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <Link
                    to="/stock"
                    search={{ product: p.id }}
                    className="max-w-full truncate font-medium hover:text-brand-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className="code text-[13px] text-ink-2">{p.sku}</span>
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
                <span
                  aria-label={left === 0 ? 'หมดแล้ว' : `เหลือ ${left} ชิ้น`}
                  className={cn('figure w-8 text-right text-xl', left === 0 && 'text-late')}
                >
                  {left}
                </span>
              </li>
            )
          })
        )}
      </ul>
      {receiving && (
        <StockInDialog
          product={receiving}
          open
          onOpenChange={(open) => {
            if (!open) setReceiving(null)
          }}
        />
      )}
    </Sheet>
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

function Sheet({
  title,
  meta,
  footer,
  children,
}: {
  title: string
  meta?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="@container panel flex flex-col">
      <header className="flex items-baseline justify-between gap-3 sheet-head px-5 py-3">
        <h2 className="font-bold">{title}</h2>
        {meta && <span className="text-[13px] text-ink-2">{meta}</span>}
      </header>
      {children}
      {footer && (
        <footer className="flex flex-wrap gap-x-6 border-t border-line px-5 py-2.5 text-[13px] font-medium empty:hidden">
          {footer}
        </footer>
      )}
    </section>
  )
}

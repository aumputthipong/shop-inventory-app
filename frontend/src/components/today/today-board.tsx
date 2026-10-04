import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  InboxIcon,
  PackageCheckIcon,
  PackagePlusIcon,
  StoreIcon,
  TriangleAlertIcon,
  TruckIcon,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'
import type { OrderStatus, OrderSummary } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { stockStatusChip } from '@/lib/labels'
import { countsQueryOptions, ordersQueryOptions, productsQueryOptions } from '@/lib/queries'

const PREVIEW = 5

export function TodayBoard({ isOwner }: { isOwner: boolean }) {
  const toPack = useQuery(ordersQueryOptions({ status: 'reserved', limit: PREVIEW }))
  const toShip = useQuery(ordersQueryOptions({ status: 'packed', limit: PREVIEW }))
  const products = useQuery(productsQueryOptions)
  const counts = useQuery({
    ...countsQueryOptions({ status: 'submitted', limit: PREVIEW }),
    enabled: isOwner,
  })

  const restock = (products.data ?? [])
    .filter((p) => p.is_active && p.stock_status !== 'in_stock')
    .sort((a, b) => a.available - b.available)
  const loaded = toPack.data && toShip.data && products.data && (!isOwner || counts.data)
  const nothingToDo =
    loaded &&
    toPack.data.total === 0 &&
    toShip.data.total === 0 &&
    restock.length === 0 &&
    (counts.data?.total ?? 0) === 0

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="ทางลัด" className="flex flex-wrap gap-2.5">
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
      </nav>

      {nothingToDo && (
        <p className="rounded-md border border-line bg-surface px-4 py-3 text-sm text-ink-2">
          ไม่มีงานค้าง ออเดอร์ส่งครบ และของทุกรายการยังพอขาย
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <OrdersCard
          title="ต้องแพ็ก"
          hint="ออเดอร์ที่จองของไว้แล้ว รอห่อ"
          icon={PackageCheckIcon}
          status="reserved"
          total={toPack.data?.total}
          orders={toPack.data?.items}
        />
        <OrdersCard
          title="รอส่ง"
          hint="แพ็กเสร็จแล้ว รอส่งให้ขนส่งหรือลูกค้า"
          icon={TruckIcon}
          status="packed"
          total={toShip.data?.total}
          orders={toShip.data?.items}
        />

        <Card
          title="ของใกล้หมด"
          hint="ควรสั่งเพิ่มหรือรับของเข้า"
          icon={TriangleAlertIcon}
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
              const chip = stockStatusChip[p.stock_status]
              return (
                <Row key={p.id}>
                  <Link
                    to="/stock"
                    search={{ product: p.id }}
                    className="min-w-0 flex-1 truncate font-medium hover:text-petrol-600 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className="text-sm text-ink-2">ขายได้ {Math.max(p.available, 0)}</span>
                  <Chip tone={chip.tone}>{chip.label}</Chip>
                </Row>
              )
            })
          )}
        </Card>

        {isOwner && (
          <Card
            title="ผลนับรอยืนยัน"
            hint="พนักงานนับแล้ว สต็อกจะเปลี่ยนเมื่อคุณยืนยัน"
            icon={ClipboardCheckIcon}
            total={counts.data?.total}
            more={
              (counts.data?.total ?? 0) > PREVIEW && (
                <Link to="/counts" className="text-petrol-600 hover:underline">
                  ดูทั้งหมด
                </Link>
              )
            }
          >
            {counts.data?.items.length === 0 ? (
              <Empty>ไม่มีผลนับที่รอยืนยัน</Empty>
            ) : (
              counts.data?.items.map((c) => (
                <Row key={c.id}>
                  <Link
                    to="/counts/$countId"
                    params={{ countId: c.id }}
                    className="min-w-0 flex-1 truncate font-medium hover:text-petrol-600 hover:underline"
                  >
                    ตรวจนับ #{c.id}
                  </Link>
                  <span className="text-sm text-ink-2">
                    ไม่ตรง {c.diff_count} จาก {c.line_count} รายการ
                  </span>
                  <span className="text-[13px] text-ink-3">{c.created_by_name ?? '-'}</span>
                </Row>
              ))
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

function OrdersCard({
  title,
  hint,
  icon,
  status,
  total,
  orders,
}: {
  title: string
  hint: string
  icon: LucideIcon
  status: OrderStatus
  total: number | undefined
  orders: OrderSummary[] | undefined
}) {
  return (
    <Card
      title={title}
      hint={hint}
      icon={icon}
      total={total}
      more={
        (total ?? 0) > 0 && (
          <Link to="/orders" search={{ status }} className="text-petrol-600 hover:underline">
            ดูทั้งหมด
          </Link>
        )
      }
    >
      {orders?.length === 0 ? (
        <Empty>ไม่มีออเดอร์ค้าง</Empty>
      ) : (
        orders?.map((o) => (
          <Row key={o.id}>
            <Link
              to="/orders/$orderId"
              params={{ orderId: o.id }}
              className="code min-w-0 flex-1 truncate font-medium hover:text-petrol-600 hover:underline"
            >
              {o.order_no}
            </Link>
            <ChannelChip channel={o.channel} />
            <span className="w-14 text-right text-sm text-ink-2">{o.item_count} ชิ้น</span>
            <span className="hidden w-24 text-right text-[13px] text-ink-3 sm:inline">
              {formatDateTime(o.created_at)}
            </span>
          </Row>
        ))
      )}
    </Card>
  )
}

function Card({
  title,
  hint,
  icon: Icon,
  total,
  more,
  children,
}: {
  title: string
  hint: string
  icon: LucideIcon
  total: number | undefined
  more?: ReactNode
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="panel flex flex-col">
      <header className="flex items-start gap-3 border-b border-line px-5 py-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-kraft-100 text-kraft-700">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-[13px] text-ink-2">{hint}</span>
        </span>
        <span className="text-2xl leading-8 font-semibold" aria-label={`${title} ${total ?? 0}`}>
          {total ?? '-'}
        </span>
      </header>
      <ul className="flex flex-col px-5 py-1">{children}</ul>
      {more && (
        <footer className="flex items-center justify-end gap-1 border-t border-line px-5 py-2.5 text-[13px] font-medium">
          {more}
          <ArrowRightIcon className="size-3.5 text-petrol-600" aria-hidden="true" />
        </footer>
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
  return <li className="py-4 text-[13px] text-ink-3">{children}</li>
}

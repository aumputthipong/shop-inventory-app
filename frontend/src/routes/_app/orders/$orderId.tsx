import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { cn } from 'cn'
import { ArrowLeftIcon, CheckIcon, PackageCheckIcon, TruckIcon, XCircleIcon } from 'lucide-react'
import { useState } from 'react'

import { ChannelChip, Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { ApiError, api, type Order, type OrderAction } from '@/lib/api'
import { formatFullDateTime, formatMoney } from '@/lib/format'
import { orderStatusChip } from '@/lib/labels'
import { invalidateStock, orderQueryOptions } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/_app/orders/$orderId')({
  params: {
    parse: (params) => ({ orderId: Number(params.orderId) }),
    stringify: (params) => ({ orderId: String(params.orderId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.orderId) || params.orderId < 1) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
      throw notFound()
    }
    try {
      await context.queryClient.query({ ...orderQueryOptions(params.orderId), staleTime: 'static' })
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <EmptyState
      title="ไม่เจอออเดอร์นี้"
      body="อาจพิมพ์เลขผิด หรือออเดอร์ถูกลบไปแล้ว"
      action={
        <Button asChild variant="outline">
          <Link to="/orders">กลับไปหน้าออเดอร์</Link>
        </Button>
      }
    />
  ),
  component: OrderPage,
})

const actionCopy: Record<OrderAction, { label: string; done: string }> = {
  pack: { label: 'แพ็กแล้ว', done: 'แพ็กเรียบร้อย' },
  ship: { label: 'ส่งแล้ว', done: 'ส่งแล้ว ตัดของออกจากคลังให้แล้ว' },
  cancel: { label: 'ยกเลิกออเดอร์', done: 'ยกเลิกแล้ว คืนของที่จองไว้กลับมาขายได้' },
}

function OrderPage() {
  const { orderId } = Route.useParams()
  const { data: order } = useSuspenseQuery(orderQueryOptions(orderId))
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirmCancel, setConfirmCancel] = useState(false)

  const act = useMutation({
    mutationFn: (action: OrderAction) => api.orderAction(order.id, action),
    onSuccess: async (updated, action) => {
      toast(`${updated.order_no} ${actionCopy[action].done}`)
      setConfirmCancel(false)
      queryClient.setQueryData(orderQueryOptions(order.id).queryKey, updated)
      await invalidateStock(queryClient)
    },
  })

  const chip = orderStatusChip[order.status]
  const primary: OrderAction | null =
    order.status === 'reserved' ? 'pack' : order.status === 'packed' ? 'ship' : null
  const cancellable = order.status === 'reserved' || order.status === 'packed'
  const staleError =
    act.error instanceof ApiError && act.error.code === 'invalid_state'
      ? 'สถานะออเดอร์เพิ่งเปลี่ยนจากเครื่องอื่น รีเฟรชหน้าเพื่อดูสถานะล่าสุด'
      : act.error
        ? 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง'
        : null

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/orders"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-sand-800 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปหน้าออเดอร์
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] leading-[42px] font-bold">{order.order_no}</h1>
            <ChannelChip channel={order.channel} />
            <Chip tone={chip.tone} className="h-7 px-3 text-sm">
              {chip.label}
            </Chip>
          </div>
          <div className="flex gap-2.5">
            {cancellable && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setConfirmCancel(true)
                }}
              >
                <XCircleIcon aria-hidden="true" />
                ยกเลิกออเดอร์
              </Button>
            )}
            {primary && (
              <Button
                size="lg"
                disabled={act.isPending}
                onClick={() => {
                  act.mutate(primary)
                }}
              >
                {primary === 'pack' ? (
                  <PackageCheckIcon aria-hidden="true" />
                ) : (
                  <TruckIcon aria-hidden="true" />
                )}
                {primary === 'pack' ? 'แพ็กแล้ว' : 'ส่งแล้ว'}
              </Button>
            )}
          </div>
        </div>
        {order.external_ref && (
          <p className="text-sand-800">เลขออเดอร์จากช่องทาง: {order.external_ref}</p>
        )}
      </div>

      {staleError && (
        <p role="alert" className="rounded-2xl bg-chip-bad px-4 py-3 text-chip-bad-fg">
          {staleError}
        </p>
      )}

      <div className="flex items-start gap-6">
        <section
          aria-label="รายการสินค้า"
          className="min-w-0 flex-1 rounded-[22px] bg-white p-6 shadow-soft"
        >
          <h2 className="mb-3 text-lg font-bold">สินค้า {order.items.length} รายการ</h2>
          <ul className="flex flex-col">
            {order.items.map((item) => (
              <li
                key={item.product_id}
                className="grid min-h-16 grid-cols-[44px_minmax(0,1fr)_90px_120px_130px] items-center gap-4 border-b border-sand-200 py-3 last:border-b-0"
              >
                <ProductAvatar name={item.name} sku={item.sku} />
                <span className="flex min-w-0 flex-col">
                  <Link
                    to="/stock"
                    search={{ product: item.product_id }}
                    className="truncate font-semibold hover:text-petrol-600 hover:underline"
                  >
                    {item.name}
                  </Link>
                  <span className="text-[13px] text-sand-800">{item.sku}</span>
                </span>
                <span className="text-right">{item.qty} ชิ้น</span>
                <span className="text-right text-sand-800">{formatMoney(item.unit_price)}</span>
                <span className="text-right font-semibold">
                  {formatMoney(Number(item.unit_price) * item.qty)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between border-t border-sand-300 pt-4">
            <span className="text-sand-800">ยอดรวม</span>
            <span className="text-2xl font-bold">{formatMoney(order.total)}</span>
          </div>
          {order.note && (
            <p className="mt-4 rounded-2xl bg-sand-50 px-4 py-3 text-sand-900">
              โน้ต: {order.note}
            </p>
          )}
        </section>

        <aside
          aria-label="สถานะ"
          className="w-[400px] shrink-0 rounded-[22px] bg-white p-6 shadow-soft"
        >
          <h2 className="mb-4 text-lg font-bold">ความคืบหน้า</h2>
          <Timeline order={order} />
          <p className="mt-5 border-t border-sand-300 pt-4 text-sm text-sand-800">
            สร้างโดย {order.created_by_name ?? '-'}
          </p>
        </aside>
      </div>

      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent>
          <DialogHeader
            icon={<XCircleIcon className="size-6" />}
            title={`ยกเลิก ${order.order_no}?`}
            description="ของที่จองไว้จะกลับมาขายได้ทันที ยกเลิกแล้วย้อนกลับไม่ได้"
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg">
                ไม่ยกเลิก
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="lg"
              disabled={act.isPending}
              onClick={() => {
                act.mutate('cancel')
              }}
            >
              ยกเลิกออเดอร์
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Timeline({ order }: { order: Order }) {
  const steps =
    order.status === 'canceled'
      ? [
          { label: 'จองของแล้ว', at: order.created_at },
          ...(order.packed_at ? [{ label: 'แพ็กแล้ว', at: order.packed_at }] : []),
          { label: 'ยกเลิก คืนของกลับเข้าสต็อก', at: order.canceled_at },
        ]
      : [
          { label: 'จองของแล้ว', at: order.created_at },
          { label: 'แพ็กแล้ว', at: order.packed_at },
          { label: 'ส่งแล้ว', at: order.shipped_at },
        ]

  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const done = step.at !== null
        const last = i === steps.length - 1
        return (
          <li key={step.label} className="relative flex gap-3.5 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-8 left-[15px] h-[calc(100%-32px)] w-0.5',
                  done ? 'bg-petrol-300' : 'bg-sand-300',
                )}
              />
            )}
            <span
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full',
                done ? 'bg-petrol-600 text-white' : 'border-2 border-sand-400 bg-white',
                order.status === 'canceled' && last && 'bg-chip-neutral-fg',
              )}
            >
              {done && <CheckIcon className="size-4" strokeWidth={2.6} aria-hidden="true" />}
            </span>
            <span className="flex flex-col pt-1">
              <span className={cn('font-semibold', !done && 'text-sand-700')}>{step.label}</span>
              <span className="text-[13px] text-sand-800">
                {step.at ? formatFullDateTime(step.at) : 'ยังไม่ถึงขั้นนี้'}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

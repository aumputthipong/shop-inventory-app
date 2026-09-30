import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from 'cn'
import { AlertCircleIcon, ArrowLeftIcon, PlusIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ProductAvatar } from '@/components/product-avatar'
import { QtyStepper } from '@/components/qty-stepper'
import { Segmented } from '@/components/segmented'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, api, shortagesOf, type Channel, type Product } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { channelDot, channelLabel, stockStatusChip } from '@/lib/labels'
import { parseQty } from '@/lib/qty'
import { invalidateStock, productsQueryOptions } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/_app/orders/new')({
  loader: ({ context }) =>
    context.queryClient.query({ ...productsQueryOptions, staleTime: 'static' }),
  component: NewOrderPage,
})

interface Line {
  productId: number
  qty: string
}

const CHANNELS: Channel[] = ['store', 'shopee', 'line']

function NewOrderPage() {
  const { data: products } = useSuspenseQuery(productsQueryOptions)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [lines, setLines] = useState<Line[]>([])
  const [channel, setChannel] = useState<Channel>('store')
  const [externalRef, setExternalRef] = useState('')
  const [note, setNote] = useState('')

  const byId = new Map(products.map((p) => [p.id, p]))
  const q = query.trim().toLowerCase()
  const choices = products.filter(
    (p) =>
      p.is_active &&
      (q === '' || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
  )

  const submit = useMutation({
    mutationFn: () =>
      api.createOrder({
        channel,
        external_ref: channel === 'store' ? undefined : externalRef.trim() || undefined,
        note: note.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.productId, qty: parseQty(l.qty) ?? 0 })),
      }),
    onSuccess: async (order) => {
      toast(`บันทึก ${order.order_no} แล้ว จองของให้เรียบร้อย`)
      await invalidateStock(queryClient)
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.code === 'insufficient_stock') {
        await queryClient.invalidateQueries({ queryKey: ['products'] })
      }
    },
  })
  const shortages = new Map(shortagesOf(submit.error).map((s) => [s.product_id, s]))

  const lineError = (line: Line, product: Product): string | null => {
    const n = parseQty(line.qty)
    if (n === null) return 'ใส่จำนวนตั้งแต่ 1 ขึ้นไป'
    const shortage = shortages.get(line.productId)
    if (shortage && n > shortage.available) {
      return shortage.available === 0
        ? 'เพิ่งมีคนจองไปหมดแล้ว'
        : `เหลือขายได้แค่ ${shortage.available} ชิ้นแล้ว`
    }
    if (n > product.available) {
      return product.available <= 0 ? 'ของหมดแล้ว' : `มีให้ขายแค่ ${product.available} ชิ้น`
    }
    return null
  }

  const rows = lines.flatMap((line) => {
    const product = byId.get(line.productId)
    return product ? [{ line, product, error: lineError(line, product) }] : []
  })
  const total = rows.reduce(
    (sum, r) => sum + Number(r.product.price) * (parseQty(r.line.qty) ?? 0),
    0,
  )
  const hasErrors = rows.some((r) => r.error !== null)
  const stillShort = rows.filter((r) => {
    const shortage = shortages.get(r.line.productId)
    return shortage !== undefined && (parseQty(r.line.qty) ?? 0) > shortage.available
  }).length
  const canSubmit = rows.length > 0 && !hasErrors && !submit.isPending

  const add = (id: number) => {
    setLines((current) =>
      current.some((l) => l.productId === id)
        ? current.map((l) =>
            l.productId === id ? { ...l, qty: String((parseQty(l.qty) ?? 0) + 1) } : l,
          )
        : [...current, { productId: id, qty: '1' }],
    )
  }

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (canSubmit) submit.mutate()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/orders"
          className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปหน้าออเดอร์
        </Link>
        <h1 className="text-[22px] leading-[30px] font-semibold">ขายหน้าร้าน</h1>
        <p className="text-sm text-ink-2">
          เลือกสินค้า ใส่จำนวน แล้วบันทึก ระบบจะจองของให้ทันที ถ้าของไม่พอจะไม่จองเลยสักชิ้น
        </p>
      </div>

      <div className="flex flex-col items-stretch gap-6 xl:flex-row xl:items-start">
        <section aria-label="เลือกสินค้า" className="panel min-w-0 flex-1 overflow-hidden">
          <div className="border-b border-line p-3">
            <label className="relative flex items-center">
              <SearchIcon
                className="pointer-events-none absolute left-2.5 size-4 text-ink-3"
                aria-hidden="true"
              />
              <Input
                type="search"
                aria-label="ค้นหาสินค้า"
                placeholder="ค้นหาชื่อหรือ SKU"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                }}
                className="pl-8"
              />
            </label>
          </div>
          {choices.length === 0 && (
            <EmptyState
              title="ไม่เจอสินค้าที่ขายได้"
              body="ลองค้นด้วยคำอื่น หรือเปิดขายสินค้าที่หน้าสต็อก"
            />
          )}
          <ul>
            {choices.map((p) => {
              const chip = stockStatusChip[p.stock_status]
              const soldOut = p.available <= 0
              return (
                <li
                  key={p.id}
                  className="grid min-h-16 grid-cols-[36px_minmax(0,1fr)_96px_120px] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <ProductAvatar name={p.name} sku={p.sku} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="flex items-center gap-2.5 text-[13px] text-ink-2">
                      <span className="code">{p.sku}</span> · {formatMoney(p.price)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span
                      className={cn(
                        'text-lg leading-6 font-semibold',
                        soldOut && 'text-destructive',
                      )}
                    >
                      {Math.max(p.available, 0)}
                    </span>
                    <Chip tone={chip.tone}>{soldOut ? 'หมดแล้ว' : 'ขายได้'}</Chip>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={soldOut}
                    onClick={() => {
                      add(p.id)
                    }}
                  >
                    <PlusIcon aria-hidden="true" />
                    ใส่ตะกร้า
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>

        <form
          onSubmit={onSubmit}
          aria-label="ตะกร้า"
          className="flex w-full shrink-0 flex-col gap-5 panel p-5 xl:sticky xl:top-[80px] xl:w-[440px]"
        >
          <h2 className="text-base font-semibold">ตะกร้า</h2>

          <Segmented
            label="ช่องทาง"
            value={channel}
            onChange={setChannel}
            options={CHANNELS.map((c) => ({
              value: c,
              label: (
                <>
                  <span aria-hidden="true" className={cn('size-1.5 rounded-full', channelDot[c])} />
                  {channelLabel[c]}
                </>
              ),
            }))}
          />

          {channel !== 'store' && (
            <label className="flex flex-col gap-2">
              <span className="text-[13px] font-medium text-ink-2">
                เลขออเดอร์จาก {channelLabel[channel]} (ไม่ใส่ก็ได้)
              </span>
              <Input
                value={externalRef}
                maxLength={100}
                onChange={(e) => {
                  setExternalRef(e.target.value)
                }}
              />
            </label>
          )}

          {stillShort > 0 && (
            <p
              role="alert"
              className="flex gap-2 rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
            >
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              สต็อกเปลี่ยนระหว่างนี้ มี {stillShort} รายการที่ของไม่พอแล้ว
              ปรับจำนวนแล้วบันทึกอีกครั้ง ยังไม่มีการจองของ
            </p>
          )}

          {rows.length === 0 ? (
            <p className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-2">
              ยังไม่มีสินค้าในตะกร้า กด “ใส่ตะกร้า” จากรายการด้านซ้าย
            </p>
          ) : (
            <ul className="flex flex-col">
              {rows.map(({ line, product, error }) => (
                <li
                  key={line.productId}
                  className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{product.name}</span>
                      <span className="text-[13px] text-ink-2">
                        {formatMoney(product.price)} · ขายได้ {Math.max(product.available, 0)} ชิ้น
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`เอา ${product.name} ออก`}
                      onClick={() => {
                        setLines((current) => current.filter((l) => l.productId !== line.productId))
                      }}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <QtyStepper
                      id={`qty-${line.productId}`}
                      value={line.qty}
                      invalid={error !== null}
                      onChange={(next) => {
                        setLines((current) =>
                          current.map((l) =>
                            l.productId === line.productId ? { ...l, qty: next } : l,
                          ),
                        )
                      }}
                    />
                    <span className="font-medium">
                      {formatMoney(Number(product.price) * (parseQty(line.qty) ?? 0))}
                    </span>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </li>
              ))}
            </ul>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-[13px] font-medium text-ink-2">โน้ต (ไม่ใส่ก็ได้)</span>
            <Input
              value={note}
              maxLength={500}
              placeholder="เช่น ลูกค้ามารับเองพรุ่งนี้"
              onChange={(e) => {
                setNote(e.target.value)
              }}
            />
          </label>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-ink-2">ยอดรวม</span>
            <span className="text-xl font-semibold">{formatMoney(total)}</span>
          </div>

          {submit.isError && shortages.size === 0 && (
            <p
              role="alert"
              className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
            >
              {submit.error instanceof ApiError && submit.error.code === 'conflict'
                ? `เลขออเดอร์นี้จาก ${channelLabel[channel]} บันทึกไว้แล้ว`
                : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'}
            </p>
          )}

          <Button type="submit" size="lg" disabled={!canSubmit}>
            {submit.isPending ? 'กำลังจองของ...' : 'บันทึกและจองของ'}
          </Button>
        </form>
      </div>
    </div>
  )
}

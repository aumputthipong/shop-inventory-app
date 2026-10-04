import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { CircleCheckIcon, Trash2Icon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { ErrorAlert } from '@/components/error-alert'
import { OnlineDetails, StoreDetails } from '@/components/orders/order-details'
import { ProductPicker } from '@/components/orders/product-picker'
import { QtyStepper } from '@/components/qty-stepper'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api, isApiError, shortagesOf, type Order, type Product } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import {
  effectSummary,
  emptyDetails,
  missingDetail,
  orderFields,
  type EntryDetails,
  type EntryMode,
} from '@/lib/order-entry'
import { parseQty } from '@/lib/qty'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'
import { useShopeeOrder } from '@/lib/use-shopee-order'

interface Line {
  productId: number
  qty: string
}

export function NewOrderForm({ products, mode }: { products: Product[]; mode: EntryMode }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const toast = useToast()

  const [lines, setLines] = useState<Line[]>([])
  const [note, setNote] = useState('')
  const [details, setDetails] = useState<EntryDetails>(emptyDetails)
  const [checkedRef, setCheckedRef] = useState('')
  const [saved, setSaved] = useState<Order | null>(null)

  const changeDetails = (patch: Partial<EntryDetails>) => {
    setSaved(null)
    setDetails((current) => ({ ...current, ...patch }))
  }

  const byId = new Map(products.map((p) => [p.id, p]))
  const shopee = mode === 'online' && details.channel === 'shopee'
  const duplicate = useShopeeOrder(shopee ? checkedRef : '').data ?? null

  const submit = useMutation({
    mutationFn: () =>
      api.createOrder({
        ...orderFields(mode, details),
        note: note.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.productId, qty: parseQty(l.qty) ?? 0 })),
      }),
    onSuccess: async (order) => {
      await invalidateStock(queryClient)
      if (mode === 'online') {
        setLines([])
        setNote('')
        setCheckedRef('')
        setDetails({ ...emptyDetails, channel: details.channel })
        setSaved(order)
        return
      }
      toast(
        order.status === 'shipped'
          ? `ขาย ${order.order_no} แล้ว ตัดของออกจากคลังให้แล้ว`
          : `บันทึก ${order.order_no} แล้ว เก็บของไว้ให้ลูกค้าแล้ว`,
      )
      await navigate({ to: '/orders/$orderId', params: { orderId: order.id } })
    },
    onError: async (error) => {
      if (isApiError(error, 'insufficient_stock')) {
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
        ? 'เพิ่งมีคนสั่งไปหมดแล้ว'
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
  const units = rows.reduce((sum, r) => sum + (parseQty(r.line.qty) ?? 0), 0)
  const hasErrors = rows.some((r) => r.error !== null)
  const stillShort = rows.filter((r) => {
    const shortage = shortages.get(r.line.productId)
    return shortage !== undefined && (parseQty(r.line.qty) ?? 0) > shortage.available
  }).length
  const missing = missingDetail(mode, details)
  const canSubmit =
    rows.length > 0 && !hasErrors && missing === null && duplicate === null && !submit.isPending

  const add = (id: number) => {
    setSaved(null)
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

  const submitLabel =
    mode === 'online'
      ? 'บันทึกออเดอร์'
      : details.handover === 'now'
        ? 'บันทึกการขาย'
        : 'บันทึกและเก็บของไว้ให้'

  return (
    <div className="flex flex-col items-stretch gap-6 xl:flex-row xl:items-start">
      <ProductPicker products={products} onAdd={add} />

      <form
        onSubmit={onSubmit}
        aria-label="ตะกร้า"
        className="flex w-full shrink-0 flex-col gap-5 panel p-5 xl:sticky xl:top-[80px] xl:w-[440px]"
      >
        <h2 className="text-base font-semibold">ตะกร้า</h2>

        {saved && (
          <p
            role="status"
            className="flex items-center gap-2 rounded-md bg-chip-ok px-3 py-2.5 text-[13px] text-chip-ok-fg"
          >
            <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
            <span>
              บันทึก{' '}
              <Link
                to="/orders/$orderId"
                params={{ orderId: saved.id }}
                className="font-medium underline"
              >
                {saved.order_no}
              </Link>{' '}
              แล้ว คีย์ใบถัดไปได้เลย
            </span>
          </p>
        )}

        {mode === 'store' ? (
          <StoreDetails details={details} onChange={changeDetails} />
        ) : (
          <OnlineDetails
            details={details}
            onChange={changeDetails}
            duplicate={duplicate}
            onRefBlur={() => {
              setCheckedRef(details.externalRef)
            }}
          />
        )}

        {stillShort > 0 && (
          <ErrorAlert>
            สต็อกเปลี่ยนระหว่างนี้ มี {stillShort} รายการที่ของไม่พอแล้ว ปรับจำนวนแล้วบันทึกอีกครั้ง
            ยังไม่ได้บันทึกอะไร
          </ErrorAlert>
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

        <Field label="โน้ต (ไม่ใส่ก็ได้)">
          <Input
            value={note}
            maxLength={500}
            onChange={(e) => {
              setNote(e.target.value)
            }}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <span className="text-ink-2">ยอดรวม</span>
          <span className="text-xl font-semibold">{formatMoney(total)}</span>
        </div>

        {submit.isError && shortages.size === 0 && (
          <ErrorAlert>
            {isApiError(submit.error, 'conflict')
              ? 'ออเดอร์ Shopee นี้บันทึกไว้แล้ว ไม่ต้องคีย์ซ้ำ'
              : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'}
          </ErrorAlert>
        )}

        {rows.length > 0 && (
          <p className="text-[13px] text-ink-2">{missing ?? effectSummary(mode, details, units)}</p>
        )}

        <Button type="submit" size="lg" disabled={!canSubmit}>
          {submit.isPending ? 'กำลังบันทึก...' : submitLabel}
        </Button>
      </form>
    </div>
  )
}

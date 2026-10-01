import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  FlaskConicalIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react'
import { useState, type ReactNode, type SubmitEvent } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { ApiError, api, shortagesOf, type LineCatalogItem, type LineReceipt } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import type { LineIdentity } from '@/lib/line-identity'

const MAX_PER_ITEM = 20
const catalogKey = ['line', 'catalog']

type Step = 'cart' | 'details'

const fieldMessage: Record<string, string> = {
  name: 'กรอกชื่อผู้รับ',
  phone: 'ใส่เบอร์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก',
  address: 'กรอกที่อยู่สำหรับจัดส่ง',
}

export function LineShop({ identity, devMode }: { identity: LineIdentity; devMode: boolean }) {
  const queryClient = useQueryClient()
  const catalog = useQuery({
    queryKey: catalogKey,
    queryFn: ({ signal }) => api.lineCatalog(signal),
  })
  const [cart, setCart] = useState<Record<number, number>>({})
  const [step, setStep] = useState<Step>('cart')
  const [name, setName] = useState(identity.displayName)
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [receipt, setReceipt] = useState<LineReceipt | null>(null)

  const items = catalog.data ?? []
  const lines = items.flatMap((item) => {
    const qty = cart[item.id] ?? 0
    return qty > 0 ? [{ item, qty }] : []
  })
  const units = lines.reduce((sum, l) => sum + l.qty, 0)
  const total = lines.reduce((sum, l) => sum + Number(l.item.price) * l.qty, 0)

  const place = useMutation({
    mutationFn: () =>
      api.placeLineOrder({
        id_token: identity.idToken,
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        note: note.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.item.id, qty: l.qty })),
      }),
    onSuccess: (r) => {
      setReceipt(r)
      setCart({})
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.code === 'insufficient_stock') {
        const short = new Map(shortagesOf(error).map((s) => [s.product_id, s.available]))
        setCart((current) => {
          const next = { ...current }
          for (const [id, available] of short)
            next[id] = Math.max(0, Math.min(next[id] ?? 0, available))
          return next
        })
        setStep('cart')
        await queryClient.invalidateQueries({ queryKey: catalogKey })
      }
    },
  })
  const shortages = shortagesOf(place.error)
  const badField =
    place.error instanceof ApiError
      ? place.error.fields.find((f) => f.field in fieldMessage)
      : undefined

  const setQty = (item: LineCatalogItem, qty: number) => {
    const cap = Math.min(MAX_PER_ITEM, item.available ?? MAX_PER_ITEM)
    setCart((current) => ({ ...current, [item.id]: Math.max(0, Math.min(qty, cap)) }))
  }

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (lines.length > 0 && name.trim() && phone.trim() && address.trim()) place.mutate()
  }

  if (receipt) {
    return (
      <Shell devMode={devMode}>
        <section
          aria-label="สั่งซื้อสำเร็จ"
          className="flex flex-col items-center gap-2 px-5 pt-10 text-center"
        >
          <CheckCircle2Icon className="size-12 text-chip-ok-fg" aria-hidden="true" />
          <h1 className="text-xl font-semibold">สั่งซื้อสำเร็จ</h1>
          <p className="text-sm text-ink-2">
            เลขออเดอร์ <span className="code font-medium text-ink">{receipt.order_no}</span>
          </p>
          <p className="text-sm text-ink-2">
            {devMode
              ? 'โหมดทดลอง: ข้อความยืนยันจะขึ้นใน log ของเซิร์ฟเวอร์แทนการส่งทาง LINE'
              : 'ร้านส่งรายละเอียดออเดอร์ให้ทาง LINE แล้ว และจะแจ้งอีกครั้งเมื่อส่งของ'}
          </p>
        </section>
        <ul className="mx-5 mt-6 panel px-4 py-1">
          {receipt.items.map((it) => (
            <li
              key={it.name}
              className="flex justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0"
            >
              <span>
                {it.name} × {it.qty}
              </span>
              <span>{formatMoney(Number(it.unit_price) * it.qty)}</span>
            </li>
          ))}
        </ul>
        <p className="mx-5 mt-3 flex justify-between font-semibold">
          <span>รวม</span>
          <span>{formatMoney(receipt.total)}</span>
        </p>
        <div className="mx-5 mt-6 flex flex-col gap-2.5">
          {identity.inClient ? (
            <Button size="lg" onClick={identity.close}>
              ปิดหน้านี้
            </Button>
          ) : (
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                setReceipt(null)
                setStep('cart')
                place.reset()
              }}
            >
              สั่งเพิ่ม
            </Button>
          )}
        </div>
      </Shell>
    )
  }

  if (step === 'details') {
    return (
      <Shell devMode={devMode}>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 px-5 pt-4 pb-28">
          <button
            type="button"
            onClick={() => {
              setStep('cart')
            }}
            className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-2"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            กลับไปแก้ตะกร้า
          </button>
          <h1 className="text-lg font-semibold">ที่อยู่จัดส่ง</h1>

          <ul className="panel px-4 py-1">
            {lines.map(({ item, qty }) => (
              <li
                key={item.id}
                className="flex justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0"
              >
                <span>
                  {item.name} × {qty}
                </span>
                <span>{formatMoney(Number(item.price) * qty)}</span>
              </li>
            ))}
          </ul>

          <Field
            label="ชื่อผู้รับ"
            error={badField?.field === 'name' ? fieldMessage.name : undefined}
          >
            <Input
              value={name}
              maxLength={100}
              autoComplete="name"
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </Field>
          <Field
            label="เบอร์โทร"
            error={badField?.field === 'phone' ? fieldMessage.phone : undefined}
          >
            <Input
              value={phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="08x-xxx-xxxx"
              onChange={(e) => {
                setPhone(e.target.value)
              }}
            />
          </Field>
          <Field
            label="ที่อยู่จัดส่ง"
            error={badField?.field === 'address' ? fieldMessage.address : undefined}
          >
            <Textarea
              value={address}
              maxLength={500}
              autoComplete="street-address"
              placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              onChange={(e) => {
                setAddress(e.target.value)
              }}
            />
          </Field>
          <Field label="ฝากถึงร้าน (ไม่ใส่ก็ได้)">
            <Input
              value={note}
              maxLength={500}
              onChange={(e) => {
                setNote(e.target.value)
              }}
            />
          </Field>

          {place.isError && shortages.length === 0 && !badField && (
            <p
              role="alert"
              className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
            >
              {place.error instanceof ApiError && place.error.status === 401
                ? 'การเข้าสู่ระบบ LINE หมดอายุ ปิดหน้านี้แล้วเปิดใหม่อีกครั้ง'
                : 'สั่งซื้อไม่สำเร็จ ลองใหม่อีกครั้ง'}
            </p>
          )}

          <BottomBar>
            <span className="flex flex-col">
              <span className="text-[13px] text-ink-2">{units} ชิ้น</span>
              <span className="text-lg font-semibold">{formatMoney(total)}</span>
            </span>
            <Button
              type="submit"
              size="lg"
              disabled={place.isPending || !name.trim() || !phone.trim() || !address.trim()}
            >
              {place.isPending ? 'กำลังสั่ง...' : 'ยืนยันสั่งซื้อ'}
            </Button>
          </BottomBar>
        </form>
      </Shell>
    )
  }

  return (
    <Shell devMode={devMode}>
      <div className="px-5 pt-4 pb-28">
        <h1 className="text-lg font-semibold">
          {identity.displayName ? `สวัสดี ${identity.displayName}` : 'เลือกสินค้า'}
        </h1>
        <p className="text-sm text-ink-2">เลือกสินค้าแล้วกดถัดไปเพื่อใส่ที่อยู่จัดส่ง</p>

        {shortages.length > 0 && (
          <div
            role="alert"
            className="mt-4 flex gap-2 rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
          >
            <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p>มีคนสั่งตัดหน้าไประหว่างนี้ ปรับจำนวนให้แล้ว ตรวจตะกร้าอีกครั้ง</p>
              <ul className="mt-1 list-disc pl-4">
                {shortages.map((s) => (
                  <li key={s.product_id}>
                    {s.name} {s.available <= 0 ? 'หมดแล้ว' : `เหลือ ${s.available} ชิ้น`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {catalog.isPending && (
          <p className="py-10 text-center text-sm text-ink-2">กำลังโหลดสินค้า...</p>
        )}
        {catalog.isError && (
          <p role="alert" className="py-10 text-center text-sm text-ink-2">
            โหลดสินค้าไม่ได้ ลองเปิดหน้านี้ใหม่
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-2.5">
          {items.map((item) => {
            const qty = cart[item.id] ?? 0
            const soldOut = item.stock_status === 'out_of_stock'
            const cap = Math.min(MAX_PER_ITEM, item.available ?? MAX_PER_ITEM)
            return (
              <li key={item.id} className="flex items-center gap-3 panel px-3.5 py-3">
                <ProductAvatar name={item.name} sku={String(item.id)} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-sm text-ink-2">
                    {formatMoney(item.price)}
                    {soldOut ? (
                      <span className="text-destructive"> · หมดแล้ว</span>
                    ) : (
                      item.available !== null && (
                        <span className="text-chip-warn-fg"> · เหลือ {item.available} ชิ้น</span>
                      )
                    )}
                  </span>
                </span>
                {qty === 0 ? (
                  <Button
                    variant="outline"
                    disabled={soldOut}
                    aria-label={`เพิ่ม ${item.name}`}
                    onClick={() => {
                      setQty(item, 1)
                    }}
                  >
                    <PlusIcon aria-hidden="true" />
                    เพิ่ม
                  </Button>
                ) : (
                  <span className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={`ลด ${item.name}`}
                      onClick={() => {
                        setQty(item, qty - 1)
                      }}
                    >
                      <MinusIcon aria-hidden="true" />
                    </Button>
                    <span
                      aria-label={`จำนวน ${item.name}`}
                      className="w-8 text-center font-semibold"
                    >
                      {qty}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={qty >= cap}
                      aria-label={`เพิ่ม ${item.name} อีก`}
                      onClick={() => {
                        setQty(item, qty + 1)
                      }}
                    >
                      <PlusIcon aria-hidden="true" />
                    </Button>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <BottomBar>
        <span className="flex flex-col">
          <span className="text-[13px] text-ink-2">{units} ชิ้น</span>
          <span className="text-lg font-semibold">{formatMoney(total)}</span>
        </span>
        <Button
          size="lg"
          disabled={lines.length === 0}
          onClick={() => {
            setStep('details')
          }}
        >
          ถัดไป
        </Button>
      </BottomBar>
    </Shell>
  )
}

function Shell({ devMode, children }: { devMode: boolean; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-canvas">
      <header className="flex items-center gap-2.5 border-b border-line bg-surface px-5 py-3">
        <BrandMark size={28} />
        <span className="text-[15px] font-semibold">สั่งซื้อผ่าน LINE</span>
      </header>
      {devMode && (
        <p className="flex items-center gap-2 bg-chip-warn px-5 py-2 text-xs text-chip-warn-fg">
          <FlaskConicalIcon className="size-3.5 shrink-0" aria-hidden="true" />
          โหมดทดลอง ไม่ได้ต่อ LINE จริง เติม ?as=ชื่อ ท้ายลิงก์เพื่อเป็นลูกค้าคนอื่น
        </p>
      )}
      {children}
    </main>
  )
}

function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 py-3">
        {children}
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  )
}

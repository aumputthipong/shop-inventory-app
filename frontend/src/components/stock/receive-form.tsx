import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { CheckCircle2Icon, PlusIcon, Trash2Icon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ProductAvatar } from '@/components/product-avatar'
import { QtyStepper } from '@/components/qty-stepper'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, type Product, type Receipt } from '@/lib/api'
import { parseQty } from '@/lib/qty'
import { invalidateStock } from '@/lib/queries'
import { useProductSearch } from '@/lib/use-product-search'

interface Line {
  productId: number
  qty: string
}

export function ReceiveForm({ products }: { products: Product[] }) {
  const queryClient = useQueryClient()
  const [lines, setLines] = useState<Line[]>([])
  const [reference, setReference] = useState('')
  const [note, setNote] = useState('')
  const [done, setDone] = useState<Receipt | null>(null)

  const byId = new Map(products.map((p) => [p.id, p]))
  const { query, setQuery, results: choices } = useProductSearch(products)
  const rows = lines.flatMap((line) => {
    const product = byId.get(line.productId)
    return product ? [{ line, product, qty: parseQty(line.qty) }] : []
  })
  const invalid = rows.some((r) => r.qty === null)
  const totalUnits = rows.reduce((sum, r) => sum + (r.qty ?? 0), 0)

  const save = useMutation({
    mutationFn: () =>
      api.receiveStock({
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        lines: rows.map((r) => ({ product_id: r.product.id, qty: r.qty ?? 0 })),
      }),
    onSuccess: async (receipt) => {
      setDone(receipt)
      setLines([])
      setReference('')
      setNote('')
      await invalidateStock(queryClient)
    },
  })

  const add = (id: number) => {
    setLines((current) =>
      current.some((l) => l.productId === id) ? current : [...current, { productId: id, qty: '1' }],
    )
  }

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (rows.length > 0 && !invalid) save.mutate()
  }

  if (done) {
    return (
      <section aria-label="รับของเข้าแล้ว" className="panel flex max-w-2xl flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2Icon className="size-6 text-chip-ok-fg" aria-hidden="true" />
          <h2 className="text-base font-semibold">
            รับของเข้าแล้ว {done.lines.length} รายการ
            {done.reference && (
              <span className="font-normal text-ink-2"> · ใบส่งของ {done.reference}</span>
            )}
          </h2>
        </div>
        <ul>
          {done.lines.map((l) => (
            <li
              key={l.product_id}
              className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-b-0"
            >
              <span className="truncate font-medium">{l.name}</span>
              <span className="text-sm text-ink-2">
                +{l.qty} · มีในคลัง {l.on_hand} · ขายได้ {l.available}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => {
              setDone(null)
            }}
          >
            รับของชุดใหม่
          </Button>
          <Button asChild variant="outline">
            <Link to="/stock">ไปหน้าสต็อก</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <div className="flex flex-col items-stretch gap-6 xl:flex-row xl:items-start">
      <section aria-label="เลือกสินค้า" className="panel min-w-0 flex-1 overflow-hidden">
        <div className="border-b border-line p-3">
          <SearchInput
            aria-label="ค้นหาสินค้า"
            placeholder="ค้นหาชื่อหรือ SKU"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
            }}
          />
        </div>
        {choices.length === 0 && (
          <EmptyState
            title={products.length === 0 ? 'ยังไม่มีสินค้า' : 'ไม่เจอสินค้าที่ค้นหา'}
            body={
              products.length === 0
                ? 'เพิ่มสินค้าที่หน้าสต็อกก่อน'
                : 'ถ้าเป็นสินค้าใหม่ ให้เพิ่มสินค้าที่หน้าสต็อกก่อน'
            }
          />
        )}
        <ul>
          {choices.map((p) => {
            const picked = lines.some((l) => l.productId === p.id)
            return (
              <li
                key={p.id}
                className="grid min-h-14 grid-cols-[36px_minmax(0,1fr)_90px_110px] items-center gap-4 border-b border-line px-4 py-2.5 last:border-b-0"
              >
                <ProductAvatar name={p.name} sku={p.sku} />
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {!p.is_active && <Chip tone="neutral">ปิดขาย</Chip>}
                  </span>
                  <span className="code text-xs text-ink-3">{p.sku}</span>
                </span>
                <span className="text-right text-sm text-ink-2">มี {p.on_hand}</span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={picked}
                  aria-label={`เพิ่ม ${p.name}`}
                  onClick={() => {
                    add(p.id)
                  }}
                >
                  <PlusIcon aria-hidden="true" />
                  {picked ? 'เลือกแล้ว' : 'เพิ่ม'}
                </Button>
              </li>
            )
          })}
        </ul>
      </section>

      <form
        onSubmit={onSubmit}
        aria-label="ของที่รับเข้า"
        noValidate
        className="flex w-full shrink-0 flex-col gap-5 panel p-5 xl:sticky xl:top-[80px] xl:w-[440px]"
      >
        <h2 className="text-base font-semibold">ของในใบส่งของนี้</h2>

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">เลขที่ใบส่งของ (ไม่ใส่ก็ได้)</span>
          <Input
            value={reference}
            maxLength={100}
            placeholder="เช่น INV-2026-0412"
            onChange={(e) => {
              setReference(e.target.value)
            }}
          />
        </label>

        {rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-2">
            ยังไม่ได้เลือกสินค้า กด “เพิ่ม” จากรายการด้านซ้าย
          </p>
        ) : (
          <ul className="flex flex-col">
            {rows.map(({ line, product, qty }) => (
              <li
                key={line.productId}
                className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{product.name}</span>
                    <span className="text-[13px] text-ink-2">
                      มีอยู่ {product.on_hand} ชิ้น
                      {qty !== null && ` → ${product.on_hand + qty} ชิ้น`}
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
                <QtyStepper
                  id={`receive-${line.productId}`}
                  value={line.qty}
                  invalid={qty === null}
                  onChange={(next) => {
                    setLines((current) =>
                      current.map((l) =>
                        l.productId === line.productId ? { ...l, qty: next } : l,
                      ),
                    )
                  }}
                />
                {qty === null && (
                  <p className="text-sm text-destructive">ใส่จำนวนตั้งแต่ 1 ขึ้นไป</p>
                )}
              </li>
            ))}
          </ul>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-medium text-ink-2">โน้ต (ไม่ใส่ก็ได้)</span>
          <Input
            value={note}
            maxLength={500}
            placeholder="เช่น ร้านส่งของ เจ๊หมวย"
            onChange={(e) => {
              setNote(e.target.value)
            }}
          />
        </label>

        {save.isError && (
          <p
            role="alert"
            className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
          >
            บันทึกไม่สำเร็จ ยังไม่มีของเข้าสต็อก ลองใหม่อีกครั้ง
          </p>
        )}

        <Button type="submit" size="lg" disabled={rows.length === 0 || invalid || save.isPending}>
          {rows.length === 0
            ? 'รับของเข้า'
            : `รับของเข้า ${rows.length} รายการ รวม ${totalUnits} ชิ้น`}
        </Button>
      </form>
    </div>
  )
}

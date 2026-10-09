import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { CheckIcon, LightbulbIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { ErrorAlert } from '@/components/error-alert'
import { SearchInput } from '@/components/search-input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api, isApiError, shortagesOf, type Product, type StockCount } from '@/lib/api'
import { formatSigned } from '@/lib/format'
import { parseCount } from '@/lib/qty'
import { invalidateStock } from '@/lib/queries'
import { useProductSearch } from '@/lib/use-product-search'

export function CountForm({
  products,
  isOwner,
  onSaved,
}: {
  products: Product[]
  isOwner: boolean
  onSaved: (count: StockCount) => void | Promise<void>
}) {
  const queryClient = useQueryClient()
  const [counted, setCounted] = useState<Partial<Record<number, string>>>({})
  const [note, setNote] = useState('')

  const { query, setQuery, results: shown } = useProductSearch(products)

  const entered = products.flatMap((p) => {
    const raw = counted[p.id]?.trim() ?? ''
    if (raw === '') return []
    return [{ product: p, value: parseCount(raw) }]
  })
  const invalid = entered.filter((e) => e.value === null).length
  const differ = entered.filter((e) => e.value !== null && e.value !== e.product.on_hand).length

  const save = useMutation({
    mutationFn: () =>
      api.createCount({
        approve: isOwner,
        note: note.trim() || undefined,
        lines: entered.map((e) => ({ product_id: e.product.id, counted: e.value ?? 0 })),
      }),
    onSuccess: async (count) => {
      await invalidateStock(queryClient)
      await onSaved(count)
    },
  })
  const shortages = shortagesOf(save.error)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (entered.length > 0 && invalid === 0) save.mutate()
  }

  const set = (id: number, value: string) => {
    setCounted((current) => ({ ...current, [id]: value }))
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <aside className="flex gap-3 rounded-md border border-line bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
        <LightbulbIcon className="mt-0.5 size-4 shrink-0 text-marker-700" aria-hidden="true" />
        <p>
          นับของที่อยู่ในร้านจริงทุกชิ้น รวมของที่แพ็กแล้วแต่ยังไม่ได้ส่ง ใส่เฉพาะสินค้าที่นับ
          ช่องที่เว้นว่างจะไม่ถูกนับ ถ้านับได้เท่ากับในระบบ กดปุ่ม “ตรง” ได้เลย
        </p>
      </aside>

      <section aria-label="สินค้าที่จะนับ" className="panel overflow-x-auto">
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

        <div className="grid h-9 min-w-[720px] grid-cols-[minmax(0,1fr)_90px_190px_90px] items-center gap-4 border-b border-line px-4 text-[13px] text-ink-2">
          <span>สินค้า</span>
          <span className="text-right">ในระบบ</span>
          <span>นับได้จริง</span>
          <span className="text-right">ต่าง</span>
        </div>

        {shown.length === 0 && (
          <EmptyState
            title={products.length === 0 ? 'ยังไม่มีสินค้าให้นับ' : 'ไม่เจอสินค้าที่ค้นหา'}
            body={
              products.length === 0 ? 'เพิ่มสินค้าที่หน้าสต็อกก่อน' : 'ลองค้นด้วยชื่อหรือ SKU อื่น'
            }
          />
        )}
        <ul>
          {shown.map((p) => {
            const raw = counted[p.id] ?? ''
            const value = raw.trim() === '' ? undefined : parseCount(raw)
            const diff = value === undefined || value === null ? null : value - p.on_hand
            return (
              <li
                key={p.id}
                className="grid min-h-14 min-w-[720px] grid-cols-[minmax(0,1fr)_90px_190px_90px] items-center gap-4 border-b border-line px-4 py-2 last:border-b-0"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    {!p.is_active && <Chip tone="neutral">ปิดขาย</Chip>}
                  </span>
                  <span className="code text-xs text-ink-3">{p.sku}</span>
                </span>
                <span className="text-right font-medium">{p.on_hand}</span>
                <span className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5">
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      aria-label={`นับได้ ${p.name}`}
                      aria-invalid={value === null ? true : undefined}
                      placeholder="-"
                      value={raw}
                      onChange={(e) => {
                        set(p.id, e.target.value)
                      }}
                      className="h-9 w-24 text-center font-semibold"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`ตรงกับระบบ ${p.name}`}
                      onClick={() => {
                        set(p.id, String(p.on_hand))
                      }}
                    >
                      <CheckIcon aria-hidden="true" />
                      ตรง
                    </Button>
                  </span>
                  {value === null && (
                    <span className="text-xs text-destructive">ใส่ตัวเลข 0 ขึ้นไป</span>
                  )}
                </span>
                <span
                  className={cn(
                    'text-right font-semibold',
                    diff === null && 'text-ink-3',
                    diff === 0 && 'font-normal text-ink-2',
                    diff !== null && diff < 0 && 'text-destructive',
                    diff !== null && diff > 0 && 'text-chip-ok-fg',
                  )}
                >
                  {diff === null ? '-' : diff === 0 ? 'ตรง' : formatSigned(diff)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="flex flex-col gap-4 panel p-5">
        <Field label="โน้ต (ไม่ใส่ก็ได้)">
          <Input
            value={note}
            maxLength={500}
            placeholder="เช่น นับชั้นหน้าร้านสิ้นเดือน"
            onChange={(e) => {
              setNote(e.target.value)
            }}
          />
        </Field>

        {shortages.length > 0 && (
          <ErrorAlert>
            <p>ยังไม่ได้บันทึก สินค้าต่อไปนี้นับได้น้อยกว่าของที่ออเดอร์จองไว้</p>
            <ul className="mt-1 list-disc pl-4">
              {shortages.map((s) => (
                <li key={s.product_id}>
                  {s.name} ลดได้อีกไม่เกิน {Math.max(s.available, 0)} ชิ้น
                </li>
              ))}
            </ul>
            <p className="mt-1">ลองนับของที่แพ็กรอส่งด้วย หรือยกเลิกออเดอร์ที่ไม่มีของจริง</p>
          </ErrorAlert>
        )}
        {save.isError && shortages.length === 0 && (
          <ErrorAlert>
            {isApiError(save.error) && save.error.status === 422
              ? 'ข้อมูลที่นับไม่ถูกต้อง ตรวจตัวเลขอีกครั้ง'
              : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'}
          </ErrorAlert>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="flex flex-wrap gap-x-4 text-sm text-ink-2">
            <span>
              นับแล้ว <span className="font-semibold text-ink">{entered.length}</span> รายการ
            </span>
            <span>
              ไม่ตรง <span className="font-semibold text-ink">{differ}</span> รายการ
            </span>
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={entered.length === 0 || invalid > 0 || save.isPending}
          >
            {isOwner ? 'บันทึกและปรับสต็อก' : 'ส่งให้เจ้าของร้านยืนยัน'}
          </Button>
        </div>
        <p className="text-xs text-ink-3">
          {isOwner
            ? 'ระบบจะปรับยอดในคลังให้ตรงกับที่นับ และบันทึกส่วนต่างไว้ในประวัติสต็อก'
            : 'สต็อกยังไม่เปลี่ยนจนกว่าเจ้าของร้านจะยืนยัน'}
        </p>
      </div>
    </form>
  )
}

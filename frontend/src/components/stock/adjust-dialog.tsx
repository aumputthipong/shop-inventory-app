import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { AlertCircleIcon, MinusIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { QtyStepper } from '@/components/qty-stepper'
import { StockPreview } from '@/components/stock/stock-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input, NativeSelect } from '@/components/ui/input'
import { ApiError, api, type AdjustReason, type Product } from '@/lib/api'
import { adjustReasonLabel } from '@/lib/labels'
import { parseQty } from '@/lib/qty'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export function AdjustDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <AdjustForm
            product={product}
            onDone={() => {
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AdjustForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [direction, setDirection] = useState<'add' | 'remove'>('remove')
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState<AdjustReason | ''>('')
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const n = parseQty(qty)
  const removing = direction === 'remove'
  const available = product.available

  let error: string | null = null
  if (n === null && qty !== '') {
    error = 'ใส่จำนวนเป็นตัวเลขตั้งแต่ 1 ขึ้นไป'
  } else if (removing && n !== null && n > available) {
    error =
      available <= 0
        ? `ตอนนี้ลดไม่ได้ ทั้ง ${product.on_hand} ชิ้นถูกจองไว้ให้ออเดอร์แล้ว`
        : `ลดได้สูงสุด ${available} ชิ้น อีก ${product.reserved} ชิ้นถูกจองไว้ให้ออเดอร์แล้ว`
  }
  const needNote = reason === 'other' && note.trim() === ''
  const valid = n !== null && error === null && reason !== '' && !needNote
  const delta = n !== null && error === null ? (removing ? -n : n) : 0

  const save = useMutation({
    mutationFn: () =>
      api.adjustStock(product.id, {
        qty_change: delta,
        reason: reason as AdjustReason,
        note: note.trim(),
      }),
    onSuccess: async (balance) => {
      const verb = removing ? `ลด ${n} ชิ้นจาก` : `เพิ่ม ${n} ชิ้นให้`
      toast(`${verb} ${product.name} แล้ว ตอนนี้ขายได้ ${balance.available} ชิ้น`)
      onDone()
      await invalidateStock(queryClient)
    },
  })

  const serverError =
    save.error instanceof ApiError && save.error.code === 'insufficient_stock'
      ? 'สต็อกเพิ่งเปลี่ยน จำนวนที่ลดได้ไม่พอแล้ว ปิดแล้วเปิดใหม่เพื่อดูยอดล่าสุด'
      : save.error
        ? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
        : null

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      <DialogHeader
        icon={<SlidersHorizontalIcon className="size-6" />}
        title="ปรับยอดสต็อก"
        description={`${product.name} · ${product.sku}`}
      />

      <div
        role="group"
        aria-label="เพิ่มหรือลด"
        className="grid grid-cols-2 gap-1 rounded-full bg-sand-200 p-1"
      >
        {(['add', 'remove'] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={direction === d}
            onClick={() => {
              setDirection(d)
            }}
            className={cn(
              'flex h-10 items-center justify-center gap-1.5 rounded-full font-semibold text-sand-800',
              direction === d && 'bg-white text-ink shadow-[0_1px_3px_rgb(64_44_24/0.14)]',
            )}
          >
            {d === 'add' ? <PlusIcon className="size-4" /> : <MinusIcon className="size-4" />}
            {d === 'add' ? 'เพิ่ม' : 'ลด'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="adjust-qty" className="text-[15px] font-semibold">
          จำนวน
        </label>
        <QtyStepper id="adjust-qty" value={qty} onChange={setQty} invalid={error !== null} />
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">เหตุผล</span>
        <NativeSelect
          value={reason}
          onChange={(e) => {
            setReason(e.target.value as AdjustReason | '')
          }}
        >
          <option value="">เลือกเหตุผล</option>
          {(Object.keys(adjustReasonLabel) as AdjustReason[]).map((r) => (
            <option key={r} value={r}>
              {adjustReasonLabel[r]}
            </option>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">
          {reason === 'other' ? 'เกิดอะไรขึ้น' : 'โน้ต (ไม่ใส่ก็ได้)'}
        </span>
        <Input
          value={note}
          maxLength={500}
          placeholder="เช่น นับชั้นวางใหม่หลังแพ็กของ"
          onChange={(e) => {
            setNote(e.target.value)
          }}
        />
      </label>

      <StockPreview onHand={product.on_hand} reserved={product.reserved} delta={delta} />

      {(error ?? serverError) && (
        <p
          role="alert"
          className="flex gap-2.5 rounded-2xl bg-chip-bad px-3.5 py-3 text-sm text-[#9a2a1f]"
        >
          <AlertCircleIcon className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          {error ?? serverError}
        </p>
      )}

      <DialogFooter>
        <span className="mr-auto text-sm text-sand-800">
          {error === null && reason === '' && 'เลือกเหตุผลก่อนนะ'}
          {error === null && needNote && 'เล่าสั้นๆ ว่าเกิดอะไรขึ้น'}
        </span>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            ยกเลิก
          </Button>
        </DialogClose>
        <Button type="submit" size="lg" disabled={!valid || save.isPending}>
          {n === null
            ? removing
              ? 'ลดออกจากสต็อก'
              : 'เพิ่มเข้าสต็อก'
            : removing
              ? `ลด ${n} ชิ้นออกจากสต็อก`
              : `เพิ่ม ${n} ชิ้นเข้าสต็อก`}
        </Button>
      </DialogFooter>
    </form>
  )
}

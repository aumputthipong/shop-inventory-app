import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheckIcon, MinusIcon, PlusIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { ErrorAlert } from '@/components/error-alert'
import { QtyStepper } from '@/components/qty-stepper'
import { Segmented } from '@/components/segmented'
import { StockPreview } from '@/components/stock/stock-preview'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, NativeSelect } from '@/components/ui/input'
import { api, isApiError, type AdjustReason, type Product } from '@/lib/api'
import { adjustReasonLabel } from '@/lib/labels'
import { parseCount, parseQty } from '@/lib/qty'
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
  const [mode, setMode] = useState<'add' | 'remove' | 'set'>('remove')
  const [qty, setQty] = useState('1')
  const [counted, setCounted] = useState('')
  const [chosenReason, setReason] = useState<AdjustReason | ''>('')
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const setting = mode === 'set'
  const countedN = parseCount(counted)
  const n = setting
    ? countedN === null
      ? null
      : Math.abs(countedN - product.on_hand)
    : parseQty(qty)
  const removing = setting ? countedN !== null && countedN < product.on_hand : mode === 'remove'
  const reason: AdjustReason | '' = setting ? 'count_correction' : chosenReason
  const available = product.available

  let error: string | null = null
  if (setting && countedN === null && counted.trim() !== '') {
    error = 'ใส่จำนวนที่นับได้เป็นตัวเลขตั้งแต่ 0 ขึ้นไป'
  } else if (!setting && n === null && qty !== '') {
    error = 'ใส่จำนวนเป็นตัวเลขตั้งแต่ 1 ขึ้นไป'
  } else if (removing && n !== null && n > available) {
    error = setting
      ? `นับได้น้อยกว่าของที่ถูกจองไว้ ${product.reserved} ชิ้น นับของที่แพ็กรอส่งด้วยหรือยัง`
      : available <= 0
        ? `ตอนนี้ลดไม่ได้ ทั้ง ${product.on_hand} ชิ้นถูกจองไว้ให้ออเดอร์แล้ว`
        : `ลดได้สูงสุด ${available} ชิ้น อีก ${product.reserved} ชิ้นถูกจองไว้ให้ออเดอร์แล้ว`
  }
  const needNote = reason === 'other' && note.trim() === ''
  const valid = n !== null && n > 0 && error === null && reason !== '' && !needNote
  const delta = n !== null && error === null ? (removing ? -n : n) : 0

  const save = useMutation({
    mutationFn: () =>
      api.adjustStock(product.id, {
        qty_change: delta,
        reason: reason as AdjustReason,
        note: note.trim(),
      }),
    onSuccess: async (balance) => {
      const verb = setting
        ? `ตั้งยอด ${product.name} เป็น ${balance.on_hand} ชิ้น`
        : `${removing ? `ลด ${n} ชิ้นจาก` : `เพิ่ม ${n} ชิ้นให้`} ${product.name}`
      toast(`${verb} แล้ว ตอนนี้ขายได้ ${balance.available} ชิ้น`)
      onDone()
      await invalidateStock(queryClient)
    },
  })

  const serverError = isApiError(save.error, 'insufficient_stock')
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
        description={`${product.name} (${product.sku})`}
      />

      <Segmented
        label="วิธีปรับ"
        value={mode}
        onChange={setMode}
        options={[
          {
            value: 'set',
            label: (
              <>
                <ClipboardCheckIcon className="size-4" aria-hidden="true" />
                นับได้จริง
              </>
            ),
          },
          {
            value: 'add',
            label: (
              <>
                <PlusIcon className="size-4" aria-hidden="true" />
                เพิ่ม
              </>
            ),
          },
          {
            value: 'remove',
            label: (
              <>
                <MinusIcon className="size-4" aria-hidden="true" />
                ลด
              </>
            ),
          },
        ]}
      />

      <p className="-mt-2 text-[13px] text-ink-2">
        {setting
          ? 'ใช้หลังนับของจริง ใส่จำนวนที่นับได้ ระบบคำนวณส่วนต่างให้'
          : 'ใช้เมื่อรู้ว่าของเปลี่ยนไปกี่ชิ้น เช่น ของเสีย 2 ชิ้น ถ้ากรอกรับของผิด ให้กด “ยกเลิก” ที่รายการนั้นในประวัติแทน'}
      </p>

      {setting ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="adjust-counted" className="text-[13px] font-medium text-ink-2">
            นับได้จริง (ชิ้น)
          </label>
          <Input
            id="adjust-counted"
            inputMode="numeric"
            autoComplete="off"
            placeholder={String(product.on_hand)}
            aria-invalid={error !== null ? true : undefined}
            value={counted}
            onChange={(e) => {
              setCounted(e.target.value)
            }}
            className="w-32 text-center text-base font-semibold"
          />
          <span className="text-xs text-ink-3">
            ในระบบมี {product.on_hand} ชิ้น นับรวมของที่แพ็กแล้วแต่ยังไม่ส่งด้วย
          </span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <label htmlFor="adjust-qty" className="text-[13px] font-medium text-ink-2">
              จำนวน
            </label>
            <QtyStepper id="adjust-qty" value={qty} onChange={setQty} invalid={error !== null} />
          </div>

          <Field label="เหตุผล">
            <NativeSelect
              value={chosenReason}
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
          </Field>
        </>
      )}

      <Field label={<>{reason === 'other' ? 'เกิดอะไรขึ้น' : 'โน้ต (ไม่ใส่ก็ได้)'}</>}>
        <Input
          value={note}
          maxLength={500}
          placeholder="เช่น นับชั้นวางใหม่หลังแพ็กของ"
          onChange={(e) => {
            setNote(e.target.value)
          }}
        />
      </Field>

      <StockPreview onHand={product.on_hand} reserved={product.reserved} delta={delta} />

      {(error ?? serverError) && <ErrorAlert>{error ?? serverError}</ErrorAlert>}

      <DialogFooter>
        <span className="mr-auto text-sm text-ink-2">
          {error === null && reason === '' && 'เลือกเหตุผลก่อนนะ'}
          {error === null && setting && n === 0 && 'ตรงกับในระบบแล้ว ไม่ต้องปรับ'}
          {error === null && needNote && 'เล่าสั้นๆ ว่าเกิดอะไรขึ้น'}
        </span>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            ยกเลิก
          </Button>
        </DialogClose>
        <Button type="submit" size="lg" disabled={!valid || save.isPending}>
          {setting
            ? countedN === null
              ? 'ตั้งยอดตามที่นับ'
              : `ตั้งยอดเป็น ${countedN} ชิ้น`
            : n === null
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

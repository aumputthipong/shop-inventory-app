import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PackagePlusIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { ErrorAlert } from '@/components/error-alert'
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
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { api, type Product } from '@/lib/api'
import { parseQty } from '@/lib/qty'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export function StockInDialog({
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
          <StockInForm
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

function StockInForm({ product, onDone }: { product: Product; onDone: () => void }) {
  const [qty, setQty] = useState('1')
  const [note, setNote] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()
  const n = parseQty(qty)

  const save = useMutation({
    mutationFn: (count: number) => api.stockIn(product.id, { qty: count, note: note.trim() }),
    onSuccess: async (balance, count) => {
      toast(`เพิ่ม ${count} ชิ้นให้ ${product.name} แล้ว ตอนนี้ขายได้ ${balance.available} ชิ้น`)
      onDone()
      await invalidateStock(queryClient)
    },
  })

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (n !== null) save.mutate(n)
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      <DialogHeader
        icon={<PackagePlusIcon className="size-6" />}
        title="รับของเข้า"
        description={`${product.name} (${product.sku})`}
      />

      <div className="flex flex-col gap-2">
        <label htmlFor="stock-in-qty" className="text-[13px] font-medium text-ink-2">
          จำนวน
        </label>
        <QtyStepper id="stock-in-qty" value={qty} onChange={setQty} invalid={n === null} />
        {n === null && qty !== '' && (
          <p className="text-sm text-destructive">ใส่จำนวนเป็นตัวเลขตั้งแต่ 1 ขึ้นไป</p>
        )}
      </div>

      <Field label="โน้ต (ไม่ใส่ก็ได้)">
        <Input
          value={note}
          maxLength={500}
          placeholder="เช่น ของล็อตใหม่จากโรงงาน บิลเลขที่ 1042"
          onChange={(e) => {
            setNote(e.target.value)
          }}
        />
      </Field>

      <StockPreview onHand={product.on_hand} reserved={product.reserved} delta={n ?? 0} />

      {save.isError && <ErrorAlert>บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง</ErrorAlert>}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            ยกเลิก
          </Button>
        </DialogClose>
        <Button type="submit" size="lg" disabled={n === null || save.isPending}>
          {n === null ? 'เพิ่มเข้าสต็อก' : `เพิ่ม ${n} ชิ้นเข้าสต็อก`}
        </Button>
      </DialogFooter>
    </form>
  )
}

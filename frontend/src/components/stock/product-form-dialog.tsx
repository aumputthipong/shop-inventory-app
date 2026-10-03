import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageIcon, PencilIcon } from 'lucide-react'
import { useState, type ChangeEvent, type ReactNode, type SubmitEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api, isApiError, type Product, type ProductDetail, type ProductInput } from '@/lib/api'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

type Field = 'sku' | 'name' | 'price' | 'low_stock_threshold' | 'initial_qty'

const fieldMessage: Record<Field, string> = {
  sku: 'ใช้ตัวอักษรอังกฤษ ตัวเลข . - _ ได้ ไม่เกิน 40 ตัว',
  name: 'กรอกชื่อสินค้า',
  price: 'ใส่ราคาเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง',
  low_stock_threshold: 'ใส่ตัวเลขตั้งแต่ 0 ขึ้นไป',
  initial_qty: 'ใส่ตัวเลขตั้งแต่ 0 ถึง 100,000',
}

function validate(form: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(form.sku.trim())) errors.sku = fieldMessage.sku
  if (form.name.trim() === '') errors.name = fieldMessage.name
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(form.price.trim())) errors.price = fieldMessage.price
  if (!/^\d{1,6}$/.test(form.low_stock_threshold.trim())) {
    errors.low_stock_threshold = fieldMessage.low_stock_threshold
  }
  const qty = form.initial_qty.trim()
  if (qty !== '' && (!/^\d{1,6}$/.test(qty) || Number(qty) > 100_000)) {
    errors.initial_qty = fieldMessage.initial_qty
  }
  return errors
}

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: {
  product?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (saved: ProductDetail) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <ProductForm
            product={product}
            onDone={(saved) => {
              onOpenChange(false)
              onSaved?.(saved)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProductForm({
  product,
  onDone,
}: {
  product?: Product
  onDone: (saved: ProductDetail) => void
}) {
  const [form, setForm] = useState<Record<Field, string>>({
    sku: product?.sku ?? '',
    name: product?.name ?? '',
    price: product?.price ?? '',
    low_stock_threshold: String(product?.low_stock_threshold ?? 5),
    initial_qty: '',
  })
  const [touched, setTouched] = useState(false)
  const queryClient = useQueryClient()
  const toast = useToast()
  const errors = validate(form)

  const save = useMutation({
    mutationFn: () => {
      const input: ProductInput = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        price: form.price.trim(),
        low_stock_threshold: Number(form.low_stock_threshold),
      }
      return product
        ? api.updateProduct(product.id, input)
        : api.createProduct({ ...input, initial_qty: Number(form.initial_qty || 0) })
    },
    onSuccess: async (saved) => {
      toast(
        product
          ? `บันทึก ${saved.name} แล้ว`
          : `เพิ่ม ${saved.name} แล้ว มีในคลัง ${saved.on_hand} ชิ้น`,
      )
      onDone(saved)
      await invalidateStock(queryClient)
    },
  })

  const serverField = new Map<string, string>()
  if (isApiError(save.error)) {
    for (const f of save.error.fields) {
      serverField.set(f.field, fieldMessage[f.field as Field])
    }
    if (save.error.code === 'conflict') serverField.set('sku', 'SKU นี้มีสินค้าอื่นใช้แล้ว')
  }
  const errorFor = (field: Field) => (touched ? errors[field] : undefined) ?? serverField.get(field)

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(errors).length === 0) save.mutate()
  }

  const set = (field: Field) => (e: ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  return (
    <form onSubmit={onSubmit} className="contents" noValidate>
      <DialogHeader
        icon={product ? <PencilIcon className="size-6" /> : <PackageIcon className="size-6" />}
        title={product ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า'}
        description={
          product
            ? product.sku
            : 'ใส่จำนวนที่มีอยู่ตอนนี้ได้เลย ระบบจะบันทึกเป็นยอดตั้งต้นในประวัติสต็อก'
        }
      />

      <FormField label="ชื่อสินค้า" error={errorFor('name')}>
        <Input
          value={form.name}
          maxLength={200}
          onChange={set('name')}
          aria-invalid={!!errorFor('name')}
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="SKU" error={errorFor('sku')}>
          <Input
            value={form.sku}
            maxLength={40}
            onChange={set('sku')}
            aria-invalid={!!errorFor('sku')}
          />
        </FormField>
        <FormField label="ราคา (บาท)" error={errorFor('price')}>
          <Input
            value={form.price}
            inputMode="decimal"
            placeholder="0.00"
            onChange={set('price')}
            aria-invalid={!!errorFor('price')}
          />
        </FormField>
      </div>
      <div className={product ? undefined : 'grid grid-cols-2 gap-3'}>
        {!product && (
          <FormField
            label="จำนวนที่มีตอนนี้ (ชิ้น)"
            hint="ไม่ใส่ก็ได้ รับของเข้าภายหลังได้"
            error={errorFor('initial_qty')}
          >
            <Input
              value={form.initial_qty}
              inputMode="numeric"
              placeholder="0"
              onChange={set('initial_qty')}
              aria-invalid={!!errorFor('initial_qty')}
            />
          </FormField>
        )}
        <FormField
          label="แจ้งเตือนเมื่อขายได้เหลือไม่เกิน (ชิ้น)"
          hint="ระบบจะขึ้นป้าย ใกล้หมด ให้"
          error={errorFor('low_stock_threshold')}
        >
          <Input
            value={form.low_stock_threshold}
            inputMode="numeric"
            onChange={set('low_stock_threshold')}
            aria-invalid={!!errorFor('low_stock_threshold')}
          />
        </FormField>
      </div>

      {save.isError && serverField.size === 0 && (
        <p role="alert" className="rounded-lg bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
          บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง
        </p>
      )}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            ยกเลิก
          </Button>
        </DialogClose>
        <Button type="submit" size="lg" disabled={save.isPending}>
          {product ? 'บันทึก' : 'เพิ่มสินค้า'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {children}
      </label>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs text-ink-3">{hint}</span>
      )}
    </div>
  )
}

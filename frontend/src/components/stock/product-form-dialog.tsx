import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PackageIcon, PencilIcon } from 'lucide-react'
import { useState, type ChangeEvent, type SubmitEvent, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ApiError, api, type Product, type ProductDetail, type ProductInput } from '@/lib/api'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

type Field = 'sku' | 'name' | 'price' | 'low_stock_threshold'

const fieldMessage: Record<Field, string> = {
  sku: 'ใช้ตัวอักษรอังกฤษ ตัวเลข . - _ ได้ ไม่เกิน 40 ตัว',
  name: 'กรอกชื่อสินค้า',
  price: 'ใส่ราคาเป็นตัวเลข ทศนิยมไม่เกิน 2 ตำแหน่ง',
  low_stock_threshold: 'ใส่ตัวเลขตั้งแต่ 0 ขึ้นไป',
}

function validate(form: Record<Field, string>): Partial<Record<Field, string>> {
  const errors: Partial<Record<Field, string>> = {}
  if (!/^[A-Za-z0-9._-]{1,40}$/.test(form.sku.trim())) errors.sku = fieldMessage.sku
  if (form.name.trim() === '') errors.name = fieldMessage.name
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(form.price.trim())) errors.price = fieldMessage.price
  if (!/^\d{1,6}$/.test(form.low_stock_threshold.trim())) {
    errors.low_stock_threshold = fieldMessage.low_stock_threshold
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
      return product ? api.updateProduct(product.id, input) : api.createProduct(input)
    },
    onSuccess: async (saved) => {
      toast(product ? `บันทึก ${saved.name} แล้ว` : `เพิ่ม ${saved.name} แล้ว`)
      onDone(saved)
      await invalidateStock(queryClient)
    },
  })

  const serverField = new Map<string, string>()
  if (save.error instanceof ApiError) {
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
        description={product ? product.sku : 'สินค้าใหม่เริ่มที่ 0 ชิ้น รับของเข้าได้หลังบันทึก'}
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
      <FormField
        label="แจ้งเตือนเมื่อเหลือขายได้ไม่เกิน (ชิ้น)"
        error={errorFor('low_stock_threshold')}
      >
        <Input
          value={form.low_stock_threshold}
          inputMode="numeric"
          onChange={set('low_stock_threshold')}
          aria-invalid={!!errorFor('low_stock_threshold')}
        />
      </FormField>

      {save.isError && serverField.size === 0 && (
        <p role="alert" className="rounded-2xl bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
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
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[15px] font-semibold">{label}</span>
      {children}
      {error && <span className="text-sm text-destructive">{error}</span>}
    </label>
  )
}

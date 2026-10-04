import { ArrowLeftIcon } from 'lucide-react'
import type { SubmitEvent } from 'react'

import { ErrorAlert } from '@/components/error-alert'
import type { CartLine } from '@/components/line/cart'
import { BottomBar, LineList, Shell, type Customer } from '@/components/line/line-layout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'

export interface Delivery {
  name: string
  phone: string
  address: string
  note: string
}

export type DeliveryField = 'name' | 'phone' | 'address'

const fieldMessage: Record<DeliveryField, string> = {
  name: 'กรอกชื่อผู้รับ',
  phone: 'ใส่เบอร์มือถือ 10 หลัก หรือเบอร์บ้าน 9 หลัก',
  address: 'กรอกที่อยู่สำหรับจัดส่ง',
}

export function DetailsStep({
  devMode,
  customer,
  lines,
  units,
  total,
  delivery,
  badField,
  error,
  pending,
  onChange,
  onBack,
  onSubmit,
}: {
  devMode: boolean
  customer: Customer
  lines: CartLine[]
  units: number
  total: number
  delivery: Delivery
  badField: DeliveryField | undefined
  error: string | null
  pending: boolean
  onChange: (patch: Partial<Delivery>) => void
  onBack: () => void
  onSubmit: () => void
}) {
  const complete = Boolean(delivery.name.trim() && delivery.phone.trim() && delivery.address.trim())

  const submit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (lines.length > 0 && complete) onSubmit()
  }

  return (
    <Shell devMode={devMode} customer={customer} step={2}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 px-5 pt-5 pb-28">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-ink-2"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          กลับไปแก้ตะกร้า
        </button>
        <h1 className="text-lg font-semibold">ที่อยู่จัดส่ง</h1>

        <section aria-label="สรุปตะกร้า" className="panel">
          <h2 className="border-b border-line px-4 py-2.5 text-[13px] font-medium text-ink-2">
            ในตะกร้า {units} ชิ้น
          </h2>
          <LineList
            className="px-4 py-1"
            rows={lines.map(({ item, qty }) => ({
              key: item.id,
              name: item.name,
              qty,
              amount: Number(item.price) * qty,
            }))}
          />
        </section>

        <section aria-label="ผู้รับ" className="flex flex-col gap-4 panel p-4">
          <Field label="ชื่อผู้รับ" error={badField === 'name' ? fieldMessage.name : undefined}>
            <Input
              value={delivery.name}
              maxLength={100}
              autoComplete="name"
              onChange={(e) => {
                onChange({ name: e.target.value })
              }}
            />
          </Field>
          <Field label="เบอร์โทร" error={badField === 'phone' ? fieldMessage.phone : undefined}>
            <Input
              value={delivery.phone}
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              placeholder="08x-xxx-xxxx"
              onChange={(e) => {
                onChange({ phone: e.target.value })
              }}
            />
          </Field>
          <Field
            label="ที่อยู่จัดส่ง"
            error={badField === 'address' ? fieldMessage.address : undefined}
          >
            <Textarea
              value={delivery.address}
              maxLength={500}
              autoComplete="street-address"
              placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              onChange={(e) => {
                onChange({ address: e.target.value })
              }}
            />
          </Field>
          <Field label="ฝากถึงร้าน (ไม่ใส่ก็ได้)">
            <Input
              value={delivery.note}
              maxLength={500}
              onChange={(e) => {
                onChange({ note: e.target.value })
              }}
            />
          </Field>
        </section>

        {error && <ErrorAlert>{error}</ErrorAlert>}

        <BottomBar units={units} total={total}>
          <Button type="submit" size="lg" disabled={pending || !complete}>
            {pending ? 'กำลังสั่ง...' : 'ยืนยันสั่งซื้อ'}
          </Button>
        </BottomBar>
      </form>
    </Shell>
  )
}

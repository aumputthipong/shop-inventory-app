import { cn } from 'cn'
import { CheckIcon, FlaskConicalIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { formatMoney } from '@/lib/format'

export interface Customer {
  name: string
  pictureUrl: string
}

const STEPS = ['เลือกสินค้า', 'ที่อยู่จัดส่ง', 'เสร็จแล้ว'] as const

export function Shell({
  devMode,
  customer,
  step,
  children,
}: {
  devMode: boolean
  customer: Customer
  step: 1 | 2 | 3
  children: ReactNode
}) {
  return (
    <main className="mx-auto min-h-svh w-full max-w-md bg-canvas">
      <header className="flex items-center gap-2.5 border-b border-line bg-surface px-5 py-3">
        <BrandMark size={32} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] leading-5 font-semibold">สั่งซื้อผ่าน LINE</span>
          <span className="text-xs text-ink-3">Shop Inventory</span>
        </span>
        <CustomerAvatar customer={customer} />
      </header>
      {devMode && (
        <p className="flex items-center gap-2 bg-chip-warn px-5 py-2 text-xs text-chip-warn-fg">
          <FlaskConicalIcon className="size-3.5 shrink-0" aria-hidden="true" />
          โหมดทดลอง ไม่ได้ต่อ LINE จริง เติม ?as=ชื่อ ท้ายลิงก์เพื่อเป็นลูกค้าคนอื่น
        </p>
      )}
      <StepBar current={step} />
      {children}
    </main>
  )
}

function CustomerAvatar({ customer }: { customer: Customer }) {
  if (customer.pictureUrl) {
    return (
      <img
        src={customer.pictureUrl}
        alt={customer.name}
        className="size-8 shrink-0 rounded-full border border-line object-cover"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-kraft-100 text-sm font-semibold text-kraft-700"
    >
      {customer.name.trim().charAt(0)}
    </span>
  )
}

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol
      aria-label="ขั้นตอนการสั่งซื้อ"
      className="flex items-center gap-2 border-b border-line bg-surface px-5 py-2.5 text-xs"
    >
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className="flex flex-1 items-center gap-1.5"
          >
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-sm text-[11px] font-semibold',
                done && 'bg-petrol-50 text-petrol-600',
                active && 'bg-petrol-600 text-white',
                !done && !active && 'bg-surface-2 text-ink-3',
              )}
            >
              {done ? <CheckIcon className="size-3" aria-hidden="true" /> : n}
            </span>
            <span className={cn('truncate', active ? 'font-medium text-ink' : 'text-ink-3')}>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function BottomBar({
  units,
  total,
  children,
}: {
  units: number
  total: number
  children: ReactNode
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 py-3">
        <span key={units} className="flex animate-rise flex-col">
          <span className="text-[13px] text-ink-2">
            {units === 0 ? 'ยังไม่ได้เลือกสินค้า' : `ในตะกร้า ${units} ชิ้น`}
          </span>
          <span className="text-lg font-semibold tabular-nums">{formatMoney(total)}</span>
        </span>
        {children}
      </div>
    </div>
  )
}

export function LineList({
  rows,
  className,
}: {
  rows: { key: string | number; name: string; qty: number; amount: number }[]
  className?: string
}) {
  return (
    <ul className={className ?? 'panel px-4 py-1'}>
      {rows.map((r) => (
        <li
          key={r.key}
          className="flex justify-between gap-3 border-b border-line py-2.5 text-sm last:border-b-0"
        >
          <span>
            {r.name} × {r.qty}
          </span>
          <span className="tabular-nums">{formatMoney(r.amount)}</span>
        </li>
      ))}
    </ul>
  )
}

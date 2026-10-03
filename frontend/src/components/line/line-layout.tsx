import { FlaskConicalIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { BrandMark } from '@/components/brand-mark'
import { formatMoney } from '@/lib/format'

export function Shell({ devMode, children }: { devMode: boolean; children: ReactNode }) {
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
        <span className="flex flex-col">
          <span className="text-[13px] text-ink-2">{units} ชิ้น</span>
          <span className="text-lg font-semibold">{formatMoney(total)}</span>
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
          <span>{formatMoney(r.amount)}</span>
        </li>
      ))}
    </ul>
  )
}

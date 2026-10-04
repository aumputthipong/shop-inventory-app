import { cn } from 'cn'
import { CheckCircle2Icon, CheckIcon } from 'lucide-react'

import { LineList, Shell, type Customer } from '@/components/line/line-layout'
import { Button } from '@/components/ui/button'
import type { LineReceipt } from '@/lib/api'
import { formatMoney } from '@/lib/format'

export function ReceiptStep({
  devMode,
  customer,
  receipt,
  inClient,
  onClose,
  onOrderAgain,
}: {
  devMode: boolean
  customer: Customer
  receipt: LineReceipt
  inClient: boolean
  onClose: () => void
  onOrderAgain: () => void
}) {
  const told = devMode ? 'ข้อความจะขึ้นใน log ของเซิร์ฟเวอร์ (โหมดทดลอง)' : 'ร้านจะแจ้งทาง LINE'
  const next = [
    { label: 'ร้านได้รับออเดอร์แล้ว', hint: 'กันของไว้ให้แล้ว ไม่มีใครซื้อตัดหน้าได้' },
    { label: 'แพ็กของ', hint: told },
    { label: 'ส่งของ', hint: told },
  ]

  return (
    <Shell devMode={devMode} customer={customer} step={3}>
      <section
        aria-label="สั่งซื้อสำเร็จ"
        className="flex animate-rise flex-col items-center gap-2 px-5 pt-8 text-center"
      >
        <CheckCircle2Icon className="size-12 text-chip-ok-fg" aria-hidden="true" />
        <h1 className="text-xl font-semibold">สั่งซื้อสำเร็จ</h1>
        <p className="text-sm text-ink-2">
          เลขออเดอร์ <span className="code font-medium text-ink">{receipt.order_no}</span>
        </p>
      </section>

      <ol aria-label="ขั้นตอนต่อไป" className="mx-5 mt-6 flex flex-col panel px-4 py-3">
        {next.map((s, i) => (
          <li key={s.label} className="flex gap-3">
            <span className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded-sm',
                  i === 0 ? 'bg-petrol-600 text-white' : 'border border-line-strong bg-surface',
                )}
              >
                {i === 0 && <CheckIcon className="size-3" aria-hidden="true" />}
              </span>
              {i < next.length - 1 && <span className="w-px flex-1 bg-line" />}
            </span>
            <span className="flex flex-col pb-3">
              <span className={cn('text-sm', i === 0 ? 'font-medium' : 'text-ink-2')}>
                {s.label}
              </span>
              <span className="text-xs text-ink-3">{s.hint}</span>
            </span>
          </li>
        ))}
      </ol>

      <section aria-label="รายการที่สั่ง" className="mx-5 mt-4 panel">
        <LineList
          className="px-4 py-1"
          rows={receipt.items.map((it) => ({
            key: it.name,
            name: it.name,
            qty: it.qty,
            amount: Number(it.unit_price) * it.qty,
          }))}
        />
        <p className="flex justify-between border-t border-line px-4 py-2.5 font-semibold">
          <span>รวม</span>
          <span className="tabular-nums">{formatMoney(receipt.total)}</span>
        </p>
      </section>

      <div className="mx-5 mt-6 flex flex-col gap-2.5 pb-8">
        {inClient ? (
          <Button size="lg" onClick={onClose}>
            ปิดหน้านี้
          </Button>
        ) : (
          <Button size="lg" variant="outline" onClick={onOrderAgain}>
            สั่งเพิ่ม
          </Button>
        )}
      </div>
    </Shell>
  )
}

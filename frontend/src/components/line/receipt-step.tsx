import { CheckCircle2Icon } from 'lucide-react'

import { LineList, Shell } from '@/components/line/line-layout'
import { Button } from '@/components/ui/button'
import type { LineReceipt } from '@/lib/api'
import { formatMoney } from '@/lib/format'

export function ReceiptStep({
  devMode,
  receipt,
  inClient,
  onClose,
  onOrderAgain,
}: {
  devMode: boolean
  receipt: LineReceipt
  inClient: boolean
  onClose: () => void
  onOrderAgain: () => void
}) {
  return (
    <Shell devMode={devMode}>
      <section
        aria-label="สั่งซื้อสำเร็จ"
        className="flex flex-col items-center gap-2 px-5 pt-10 text-center"
      >
        <CheckCircle2Icon className="size-12 text-chip-ok-fg" aria-hidden="true" />
        <h1 className="text-xl font-semibold">สั่งซื้อสำเร็จ</h1>
        <p className="text-sm text-ink-2">
          เลขออเดอร์ <span className="code font-medium text-ink">{receipt.order_no}</span>
        </p>
        <p className="text-sm text-ink-2">
          {devMode
            ? 'โหมดทดลอง: ข้อความยืนยันจะขึ้นใน log ของเซิร์ฟเวอร์แทนการส่งทาง LINE'
            : 'ร้านส่งรายละเอียดออเดอร์ให้ทาง LINE แล้ว และจะแจ้งอีกครั้งเมื่อส่งของ'}
        </p>
      </section>
      <LineList
        className="mx-5 mt-6 panel px-4 py-1"
        rows={receipt.items.map((it) => ({
          key: it.name,
          name: it.name,
          qty: it.qty,
          amount: Number(it.unit_price) * it.qty,
        }))}
      />
      <p className="mx-5 mt-3 flex justify-between font-semibold">
        <span>รวม</span>
        <span>{formatMoney(receipt.total)}</span>
      </p>
      <div className="mx-5 mt-6 flex flex-col gap-2.5">
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

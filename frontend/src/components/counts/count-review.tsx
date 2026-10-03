import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from 'cn'
import { AlertCircleIcon, ClipboardCheckIcon } from 'lucide-react'
import { useState } from 'react'

import { ProductAvatar } from '@/components/product-avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { api, isApiError, shortagesOf, type StockCount } from '@/lib/api'
import { varianceTotals } from '@/lib/counts'
import { formatSigned } from '@/lib/format'
import { countQueryOptions, invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export function CountLines({ count }: { count: StockCount }) {
  const lines = [...count.lines].sort((a, b) => Number(b.variance !== 0) - Number(a.variance !== 0))
  const pending = count.status === 'submitted'

  return (
    <section aria-label="ผลการนับ" className="panel overflow-x-auto">
      <div className="grid h-9 min-w-[720px] grid-cols-[36px_minmax(0,1fr)_110px_90px_90px] items-center gap-4 border-b border-line bg-surface-2 px-4 text-[13px] text-ink-2">
        <span />
        <span>สินค้า</span>
        <span className="text-right">ในระบบตอนนับ</span>
        <span className="text-right">นับได้</span>
        <span className="text-right">ต่าง</span>
      </div>
      <ul>
        {lines.map((l) => (
          <li
            key={l.product_id}
            className="grid min-h-14 min-w-[720px] grid-cols-[36px_minmax(0,1fr)_110px_90px_90px] items-center gap-4 border-b border-line px-4 py-2 last:border-b-0"
          >
            <ProductAvatar name={l.name} sku={l.sku} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{l.name}</span>
              <span className="code text-xs text-ink-3">{l.sku}</span>
              {pending && l.on_hand_now !== l.expected && (
                <span className="text-xs text-kraft-700">
                  หลังนับมีของเข้าออก ตอนนี้ในระบบ {l.on_hand_now} ชิ้น ระบบจะปรับเฉพาะส่วนต่าง
                </span>
              )}
            </span>
            <span className="text-right text-ink-2">{l.expected}</span>
            <span className="text-right font-medium">{l.counted}</span>
            <VarianceCell value={l.variance} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function VarianceCell({ value }: { value: number }) {
  return (
    <span
      className={cn(
        'text-right font-semibold',
        value === 0 && 'font-normal text-ink-3',
        value < 0 && 'text-destructive',
        value > 0 && 'text-chip-ok-fg',
      )}
    >
      {value === 0 ? 'ตรง' : formatSigned(value)}
    </span>
  )
}

export function CountDecision({ count }: { count: StockCount }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const [confirm, setConfirm] = useState(false)
  const totals = varianceTotals(count.lines)

  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => api.decideCount(count.id, decision),
    onSuccess: async (updated) => {
      setConfirm(false)
      toast(
        updated.status === 'approved'
          ? `ปรับสต็อกตามผลนับ #${updated.id} แล้ว`
          : `ไม่ใช้ผลนับ #${updated.id} สต็อกไม่เปลี่ยน`,
      )
      queryClient.setQueryData(countQueryOptions(count.id).queryKey, updated)
      await invalidateStock(queryClient)
    },
  })
  const shortages = shortagesOf(decide.error)

  let error: string | null = null
  if (isApiError(decide.error, 'invalid_state')) {
    error = 'ผลนับนี้เพิ่งถูกตัดสินจากเครื่องอื่น รีเฟรชหน้าเพื่อดูสถานะล่าสุด'
  } else if (decide.error && shortages.length === 0) {
    error = 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง'
  }

  return (
    <div className="flex flex-col gap-3">
      {shortages.length > 0 && (
        <div
          role="alert"
          className="flex gap-2 rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg"
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p>ปรับไม่ได้ ของบางส่วนถูกออเดอร์จองไว้</p>
            <ul className="mt-1 list-disc pl-4">
              {shortages.map((s) => (
                <li key={s.product_id}>
                  {s.name} ลดได้อีกไม่เกิน {Math.max(s.available, 0)} ชิ้น
                </li>
              ))}
            </ul>
            <p className="mt-1">ให้นับใหม่โดยรวมของที่แพ็กรอส่ง หรือยกเลิกออเดอร์ที่ไม่มีของจริง</p>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="outline"
          size="lg"
          disabled={decide.isPending}
          onClick={() => {
            decide.mutate('reject')
          }}
        >
          ไม่ใช้ผลนับนี้
        </Button>
        <Button
          size="lg"
          disabled={decide.isPending}
          onClick={() => {
            setConfirm(true)
          }}
        >
          <ClipboardCheckIcon aria-hidden="true" />
          ยืนยันและปรับสต็อก
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader
            icon={<ClipboardCheckIcon className="size-6" />}
            title={`ปรับสต็อกตามผลนับ #${count.id}?`}
            description={
              totals.changed === 0
                ? 'ทุกรายการนับได้ตรงกับระบบ ไม่มีสต็อกที่ต้องปรับ'
                : `จะปรับ ${totals.changed} รายการ เพิ่มรวม ${totals.added} ชิ้น ลดรวม ${totals.removed} ชิ้น ส่วนต่างจะบันทึกไว้ในประวัติสต็อก`
            }
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg">
                กลับไปดูก่อน
              </Button>
            </DialogClose>
            <Button
              size="lg"
              disabled={decide.isPending}
              onClick={() => {
                decide.mutate('approve')
              }}
            >
              ยืนยัน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

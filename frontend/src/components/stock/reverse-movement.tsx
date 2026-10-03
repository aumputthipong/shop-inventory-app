import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Undo2Icon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { api, isApiError, type Movement } from '@/lib/api'
import { formatDateTime, formatSigned } from '@/lib/format'
import { movementChip } from '@/lib/labels'
import { invalidateStock } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export function ReverseMovementButton({ movement }: { movement: Movement }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true)
        }}
      >
        <Undo2Icon aria-hidden="true" />
        ยกเลิก
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {open && (
            <ReverseForm
              movement={movement}
              onDone={() => {
                setOpen(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReverseForm({ movement: m, onDone }: { movement: Movement; onDone: () => void }) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const kind = movementChip[m.type].label

  const reverse = useMutation({
    mutationFn: () => api.reverseMovement(m.id),
    onSuccess: async (balance) => {
      toast(`ยกเลิกรายการ${kind}แล้ว ตอนนี้ ${m.product_name} ขายได้ ${balance.available} ชิ้น`)
      onDone()
      await invalidateStock(queryClient)
    },
  })

  let error: string | null = null
  if (isApiError(reverse.error)) {
    const reason = (reverse.error.details as { reason?: string } | undefined)?.reason
    if (reverse.error.code === 'insufficient_stock') {
      const available = (reverse.error.details as { available?: number } | undefined)?.available
      error = `ยกเลิกไม่ได้ ของบางส่วนถูกจองให้ออเดอร์ไปแล้ว ตอนนี้ขายได้เหลือ ${available ?? 0} ชิ้น`
    } else if (reason === 'already_reversed') {
      error = 'รายการนี้ถูกยกเลิกไปแล้ว'
    } else if (reason === 'too_old') {
      error = 'รายการนี้เกิน 7 วันแล้ว ให้ใช้การปรับยอดแทน'
    } else {
      error = 'ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง'
    }
  } else if (reverse.error) {
    error = 'ยกเลิกไม่สำเร็จ ลองใหม่อีกครั้ง'
  }

  return (
    <>
      <DialogHeader
        icon={<Undo2Icon />}
        title={`ยกเลิกรายการ${kind}?`}
        description="ใช้เมื่อกรอกผิด ระบบจะลงรายการกลับให้ ส่วนรายการเดิมยังอยู่ในประวัติ"
      />
      <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-y-1.5 rounded-md border border-line bg-surface-2 p-4 text-sm">
        <dt className="text-ink-2">สินค้า</dt>
        <dd className="font-medium">{m.product_name}</dd>
        <dt className="text-ink-2">รายการเดิม</dt>
        <dd>
          {kind} {formatSigned(m.qty_change)} ชิ้น
        </dd>
        <dt className="text-ink-2">เมื่อ</dt>
        <dd>{formatDateTime(m.created_at)}</dd>
        <dt className="text-ink-2">หลังยกเลิก</dt>
        <dd className="font-medium">มีในคลัง {formatSigned(-m.qty_change)} ชิ้น</dd>
      </dl>
      {error && (
        <p role="alert" className="rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg">
          {error}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline" size="lg">
            ไม่ยกเลิก
          </Button>
        </DialogClose>
        <Button
          size="lg"
          disabled={reverse.isPending}
          onClick={() => {
            reverse.mutate()
          }}
        >
          ยกเลิกรายการนี้
        </Button>
      </DialogFooter>
    </>
  )
}

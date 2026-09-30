import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function Pager({
  offset,
  limit,
  total,
  onChange,
}: {
  offset: number
  limit: number
  total: number
  onChange: (offset: number) => void
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)
  return (
    <div className="flex items-center justify-between px-4 pt-3.5 pb-1.5 text-[13px] text-ink-2">
      <span>
        แสดง {from}–{to} จาก {total} รายการ
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="หน้าก่อนหน้า"
          disabled={offset === 0}
          onClick={() => {
            onChange(Math.max(offset - limit, 0))
          }}
        >
          <ChevronLeftIcon aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="หน้าถัดไป"
          disabled={offset + limit >= total}
          onClick={() => {
            onChange(offset + limit)
          }}
        >
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

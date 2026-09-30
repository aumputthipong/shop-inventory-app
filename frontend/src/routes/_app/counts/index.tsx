import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClipboardCheckIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { Pager } from '@/components/pager'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { countStatusChip } from '@/lib/labels'
import { countsQueryOptions } from '@/lib/queries'

const PAGE = 20

interface CountsSearch {
  offset?: number
}

export const Route = createFileRoute('/_app/counts/')({
  validateSearch: (search: Record<string, unknown>): CountsSearch => ({
    offset: Number(search.offset) > 0 ? Number(search.offset) : undefined,
  }),
  component: CountsPage,
})

function CountsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const offset = search.offset ?? 0
  const { data, isPending } = useQuery(countsQueryOptions({ limit: PAGE, offset }))

  const start = (
    <Button asChild>
      <Link to="/counts/new">
        <ClipboardCheckIcon aria-hidden="true" />
        เริ่มนับสต็อก
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold">ตรวจนับสต็อก</h1>
          <p className="text-sm text-ink-2">
            นับของจริงเทียบกับตัวเลขในระบบ จะได้รู้ว่าของหายหรือกรอกผิดตรงไหน
          </p>
        </div>
        {start}
      </div>

      <section aria-label="รายการตรวจนับ" className="panel overflow-x-auto">
        <div className="grid h-9 min-w-[760px] grid-cols-[90px_150px_100px_100px_minmax(0,1fr)_120px] items-center gap-4 border-b border-line bg-surface-2 px-4 text-[13px] text-ink-2">
          <span>เลขที่</span>
          <span>สถานะ</span>
          <span className="text-right">นับ</span>
          <span className="text-right">ไม่ตรง</span>
          <span>นับโดย</span>
          <span className="text-right">เวลา</span>
        </div>

        {isPending && <p className="px-4 py-8 text-[13px] text-ink-2">กำลังโหลด...</p>}
        {data?.items.length === 0 && (
          <EmptyState
            title="ยังไม่เคยตรวจนับ"
            body="แนะนำให้นับเดือนละครั้ง หรือเมื่อสงสัยว่าตัวเลขในระบบไม่ตรงกับของจริง"
            action={start}
          />
        )}
        <ul>
          {data?.items.map((c) => {
            const chip = countStatusChip[c.status]
            return (
              <li key={c.id} className="border-b border-line last:border-b-0">
                <Link
                  to="/counts/$countId"
                  params={{ countId: c.id }}
                  className="grid min-h-14 min-w-[760px] grid-cols-[90px_150px_100px_100px_minmax(0,1fr)_120px] items-center gap-4 px-4 py-2.5 hover:bg-surface-2"
                >
                  <span className="flex flex-col">
                    <span className="code font-medium">#{c.id}</span>
                  </span>
                  <span>
                    <Chip tone={chip.tone}>{chip.label}</Chip>
                  </span>
                  <span className="text-right">{c.line_count} รายการ</span>
                  <span
                    className={
                      c.diff_count > 0 ? 'text-right font-medium' : 'text-right text-ink-3'
                    }
                  >
                    {c.diff_count} รายการ
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-ink-2">{c.created_by_name ?? '-'}</span>
                    {c.note && <span className="truncate text-xs text-ink-3">{c.note}</span>}
                  </span>
                  <span className="text-right text-[13px] text-ink-3">
                    {formatDateTime(c.created_at)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        {data && data.total > 0 && (
          <Pager
            offset={offset}
            limit={PAGE}
            total={data.total}
            onChange={(next) => {
              void navigate({ search: { offset: next || undefined }, replace: true })
            }}
          />
        )}
      </section>
    </div>
  )
}

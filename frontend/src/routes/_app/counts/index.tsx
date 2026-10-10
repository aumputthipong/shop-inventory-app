import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ClipboardCheckIcon } from 'lucide-react'

import { Chip } from '@/components/chip'
import { EmptyState } from '@/components/empty-state'
import { FilterTabs } from '@/components/filter-tabs'
import { PageHeader } from '@/components/page-header'
import { Pager } from '@/components/pager'
import { Button } from '@/components/ui/button'
import type { CountStatus } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import { countStatusChip } from '@/lib/labels'
import { countsQueryOptions } from '@/lib/queries'
import { parseOffset } from '@/lib/search-params'

const PAGE = 20
const STATUSES: CountStatus[] = ['submitted', 'approved', 'rejected']

interface CountsSearch {
  status?: CountStatus
  offset?: number
}

export const Route = createFileRoute('/_app/counts/')({
  validateSearch: (search: Record<string, unknown>): CountsSearch => ({
    status: STATUSES.includes(search.status as CountStatus)
      ? (search.status as CountStatus)
      : undefined,
    offset: parseOffset(search.offset),
  }),
  component: CountsPage,
})

function CountsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const offset = search.offset ?? 0
  const { data, isPending } = useQuery(
    countsQueryOptions({ status: search.status, limit: PAGE, offset }),
  )
  const setSearch = (next: CountsSearch) => {
    void navigate({ search: next, replace: true })
  }

  const start = (
    <Button asChild>
      <Link to="/counts/new">
        <ClipboardCheckIcon aria-hidden="true" />
        เริ่มตรวจนับ
      </Link>
    </Button>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ตรวจนับสต็อก" actions={<>{start}</>} />

      <section aria-label="รายการตรวจนับ" className="panel overflow-x-auto">
        <div className="min-w-[760px] border-b border-line px-4 pt-2">
          <FilterTabs
            label="สถานะผลนับ"
            value={search.status}
            onChange={(status) => {
              setSearch({ status, offset: undefined })
            }}
            options={[
              { value: undefined, label: 'ทั้งหมด' },
              ...STATUSES.map((status) => ({
                value: status,
                label: countStatusChip[status].label,
              })),
            ]}
          />
        </div>
        <div className="grid h-9 min-w-[760px] grid-cols-[90px_150px_100px_100px_minmax(0,1fr)_120px] items-center gap-4 border-b border-line px-4 text-[13px] text-ink-2">
          <span>เลขที่</span>
          <span>สถานะ</span>
          <span className="text-right">นับ</span>
          <span className="text-right">ไม่ตรง</span>
          <span>นับโดย</span>
          <span className="text-right">เวลา</span>
        </div>

        {isPending && <p className="px-4 py-8 text-[13px] text-ink-2">กำลังโหลด...</p>}
        {data?.items.length === 0 &&
          (search.status ? (
            <EmptyState title="ไม่มีผลนับในสถานะนี้" body="ลองเลือกสถานะอื่น" />
          ) : (
            <EmptyState
              title="ยังไม่เคยตรวจนับ"
              body="แนะนำให้นับเดือนละครั้ง หรือเมื่อสงสัยว่าตัวเลขในระบบไม่ตรงกับของจริง"
              action={start}
            />
          ))}
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
              setSearch({ ...search, offset: next || undefined })
            }}
          />
        )}
      </section>
    </div>
  )
}

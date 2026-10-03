import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'

import { Chip } from '@/components/chip'
import { CountDecision, CountLines } from '@/components/counts/count-review'
import { EmptyState } from '@/components/empty-state'
import { BackLink } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/lib/api'
import { varianceTotals } from '@/lib/counts'
import { formatFullDateTime, formatSigned } from '@/lib/format'
import { countStatusChip } from '@/lib/labels'
import { countQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app/counts/$countId')({
  params: {
    parse: (params) => ({ countId: Number(params.countId) }),
    stringify: (params) => ({ countId: String(params.countId) }),
  },
  loader: async ({ context, params }) => {
    if (!Number.isInteger(params.countId) || params.countId < 1) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
      throw notFound()
    }
    try {
      await context.queryClient.query({ ...countQueryOptions(params.countId), staleTime: 'static' })
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
        throw notFound()
      }
      throw error
    }
  },
  notFoundComponent: () => (
    <EmptyState
      title="ไม่เจอผลตรวจนับนี้"
      body="อาจพิมพ์เลขผิด ลองกลับไปเลือกจากรายการ"
      action={
        <Button asChild variant="outline">
          <Link to="/counts">กลับไปหน้าตรวจนับ</Link>
        </Button>
      }
    />
  ),
  component: CountPage,
})

function CountPage() {
  const { countId } = Route.useParams()
  const { data: count } = useSuspenseQuery(countQueryOptions(countId))
  const me = useCurrentUser()
  const chip = countStatusChip[count.status]
  const totals = varianceTotals(count.lines)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <BackLink to="/counts">กลับไปหน้าตรวจนับ</BackLink>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] leading-[30px] font-semibold">ตรวจนับ #{count.id}</h1>
          <Chip tone={chip.tone}>{chip.label}</Chip>
        </div>
        <p className="text-sm text-ink-2">
          นับโดย {count.created_by_name ?? '-'} · {formatFullDateTime(count.created_at)}
          {count.decided_at && (
            <>
              {' '}
              · {count.status === 'approved' ? 'ยืนยันโดย' : 'ตัดสินโดย'}{' '}
              {count.decided_by_name ?? '-'} {formatFullDateTime(count.decided_at)}
            </>
          )}
        </p>
        {count.note && <p className="mt-1 text-sm text-ink-2">โน้ต: {count.note}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="นับทั้งหมด" value={`${count.lines.length} รายการ`} />
        <Stat label="ไม่ตรงกับระบบ" value={`${totals.changed} รายการ`} />
        <Stat label="นับได้เกิน" value={`${formatSigned(totals.added)} ชิ้น`} />
        <Stat label="นับได้ขาด" value={`${formatSigned(-totals.removed)} ชิ้น`} />
      </dl>

      {count.status === 'submitted' &&
        (me.isOwner ? (
          <CountDecision count={count} />
        ) : (
          <p className="rounded-md bg-chip-warn px-4 py-3 text-sm text-chip-warn-fg">
            รอเจ้าของร้านยืนยัน สต็อกยังไม่เปลี่ยนจนกว่าจะยืนยัน
          </p>
        ))}

      <CountLines count={count} />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <dt className="text-[13px] text-ink-2">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  )
}

import { cn } from 'cn'

type Kind = 'available' | 'incoming' | 'removing' | 'held'

interface Segment {
  kind: Kind
  count: number
}

const kindClass: Record<Kind, string> = {
  available: 'bg-petrol-600',
  incoming: 'border-[1.5px] border-dashed border-petrol-600 bg-petrol-200',
  removing: 'border-[1.5px] border-dashed border-destructive',
  held: 'bg-hatch',
}

interface UnitStripProps {
  available: number
  held: number
  incoming?: number
  removing?: number
  size?: 'sm' | 'lg'
  className?: string
}

const CELL_LIMIT = { sm: 24, lg: 40 } as const

// One cell per unit while it fits; beyond the limit it becomes a proportional bar.
export function UnitStrip({
  available,
  held,
  incoming = 0,
  removing = 0,
  size = 'sm',
  className,
}: UnitStripProps) {
  const segments: Segment[] = [
    { kind: 'available', count: Math.max(available - removing, 0) },
    { kind: 'incoming', count: incoming },
    { kind: 'removing', count: Math.min(removing, Math.max(available, 0)) },
    { kind: 'held', count: held },
  ]
  const total = segments.reduce((sum, s) => sum + s.count, 0)
  const label = `ขายได้ ${Math.max(available, 0)} ชิ้น รอดำเนินการ ${held} ชิ้น`

  if (total === 0) {
    return (
      <div
        role="img"
        aria-label="ไม่มีของในคลัง"
        className={cn('text-[13px] text-ink-3', className)}
      >
        ไม่มีของในคลัง
      </div>
    )
  }

  if (total > CELL_LIMIT[size]) {
    return (
      <div role="img" aria-label={label} className={cn('flex w-full gap-[3px]', className)}>
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <span
              key={s.kind}
              className={cn('block rounded-xs', size === 'lg' ? 'h-3' : 'h-2.5', kindClass[s.kind])}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          ))}
      </div>
    )
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('flex flex-wrap items-center', size === 'lg' ? 'gap-1' : 'gap-0.5', className)}
    >
      {segments.flatMap((s) =>
        Array.from({ length: s.count }, (_, i) => (
          <span
            key={`${s.kind}-${i}`}
            className={cn(
              'block shrink-0',
              size === 'lg' ? 'h-5 w-3.5 rounded-xs' : 'h-4 w-1.5 rounded-[1px]',
              kindClass[s.kind],
            )}
          />
        )),
      )}
    </div>
  )
}

export function UnitLegend() {
  return (
    <div className="flex gap-4 text-[13px] text-ink-2">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-4 w-3 rounded bg-petrol-600" />
        ขายได้
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-4 w-3 rounded bg-hatch" />
        รอดำเนินการ
      </span>
    </div>
  )
}

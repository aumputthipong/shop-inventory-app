import { cn } from 'cn'

type Kind = 'available' | 'incoming' | 'removing' | 'held'

interface Segment {
  kind: Kind
  count: number
}

const kindClass: Record<Kind, string> = {
  available: 'bg-brand-600',
  incoming: 'border-[1.5px] border-dashed border-brand-600 bg-brand-200',
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
        <span aria-hidden="true" className="h-4 w-3 rounded bg-brand-600" />
        ขายได้
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="h-4 w-3 rounded bg-hatch" />
        รอดำเนินการ
      </span>
    </div>
  )
}

export function StockBar({
  onHand,
  held,
  className,
}: {
  onHand: number
  held: number
  className?: string
}) {
  const available = Math.max(onHand - held, 0)
  const caption =
    onHand === 0
      ? 'ไม่มีของในคลัง'
      : held === 0
        ? `มีในคลัง ${onHand} ยังไม่มีออเดอร์จอง`
        : held >= onHand
          ? `จองไว้ครบทั้ง ${onHand}`
          : `จองไว้ ${held} จาก ${onHand}`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        role="img"
        aria-label={`ขายได้ ${available} ชิ้น จองไว้ ${held} ชิ้น จากที่มี ${onHand} ชิ้น`}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-xs bg-line"
      >
        {available > 0 && (
          <span
            className="block bg-brand-600"
            style={{ width: `${(available / onHand) * 100}%` }}
          />
        )}
        {held > 0 && onHand > 0 && (
          <span
            className="block min-w-1 flex-1 bg-hatch"
            style={{ maxWidth: `${(Math.min(held, onHand) / onHand) * 100}%` }}
          />
        )}
      </div>
      <span className="text-xs text-ink-3">{caption}</span>
    </div>
  )
}

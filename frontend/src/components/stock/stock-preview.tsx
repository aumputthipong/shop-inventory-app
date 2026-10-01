import { UnitStrip } from '@/components/unit-strip'

export function StockPreview({
  onHand,
  reserved,
  delta,
}: {
  onHand: number
  reserved: number
  delta: number
}) {
  const available = onHand - reserved
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface-2 p-4">
      <UnitStrip
        size="lg"
        available={available}
        held={reserved}
        incoming={Math.max(delta, 0)}
        removing={Math.max(-delta, 0)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Change label="มีในคลัง" before={onHand} after={onHand + delta} />
        <Change label="ขายได้" before={available} after={available + delta} highlight />
      </div>
    </div>
  )
}

function Change({
  label,
  before,
  after,
  highlight,
}: {
  label: string
  before: number
  after: number
  highlight?: boolean
}) {
  return (
    <div>
      <div className="text-xs text-ink-2">{label}</div>
      <div className="text-lg leading-7" aria-label={`${label} ${before} เป็น ${after}`}>
        <span className="text-ink-3">{before}</span>
        <span className="mx-1.5 text-ink-3" aria-hidden="true">
          →
        </span>
        <span className={highlight ? 'font-semibold text-petrol-600' : 'font-semibold'}>
          {after}
        </span>
      </div>
    </div>
  )
}

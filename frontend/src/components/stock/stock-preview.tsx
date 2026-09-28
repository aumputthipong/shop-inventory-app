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
    <div className="flex flex-col gap-3.5 rounded-[18px] bg-sand-50 p-[18px]">
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
      <div className="text-[13px] text-sand-800">{label}</div>
      <div className="text-[22px] leading-[30px]" aria-label={`${label} ${before} เป็น ${after}`}>
        <span className="text-sand-700">{before}</span>
        <span className="mx-1.5 text-sand-700" aria-hidden="true">
          →
        </span>
        <span className={highlight ? 'font-bold text-petrol-600' : 'font-bold'}>{after}</span>
      </div>
    </div>
  )
}

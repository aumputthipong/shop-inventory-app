import { MinusIcon, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseQty } from '@/lib/qty'

export function QtyStepper({
  id,
  value,
  onChange,
  invalid,
  max,
  unit = 'ชิ้น',
}: {
  id: string
  value: string
  onChange: (next: string) => void
  invalid?: boolean
  max?: number
  unit?: string
}) {
  const current = parseQty(value) ?? 0
  const step = (delta: number) => {
    const next = Math.max(1, current + delta)
    onChange(String(max === undefined ? next : Math.min(next, Math.max(max, 1))))
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="ลดจำนวน"
        onClick={() => {
          step(-1)
        }}
      >
        <MinusIcon aria-hidden="true" />
      </Button>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        aria-invalid={invalid ? true : undefined}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
        }}
        className="h-9 w-20 text-center text-base font-semibold"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="เพิ่มจำนวน"
        disabled={max !== undefined && current >= max}
        onClick={() => {
          step(1)
        }}
      >
        <PlusIcon aria-hidden="true" />
      </Button>
      <span className="ml-1 text-sm text-ink-2">{unit}</span>
    </div>
  )
}

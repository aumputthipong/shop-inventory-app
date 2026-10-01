import { MinusIcon, PlusIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { parseQty } from '@/lib/qty'

export function QtyStepper({
  id,
  value,
  onChange,
  invalid,
  unit = 'ชิ้น',
}: {
  id: string
  value: string
  onChange: (next: string) => void
  invalid?: boolean
  unit?: string
}) {
  const step = (delta: number) => {
    onChange(String(Math.max(1, (parseQty(value) ?? 0) + delta)))
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

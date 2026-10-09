import { cn } from 'cn'
import type { ReactNode } from 'react'

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-0.5 rounded-md border border-line bg-surface-2 p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value)
            }}
            className={cn(
              'flex h-8 items-center justify-center gap-1.5 rounded-sm text-sm',
              active
                ? 'bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(28_31_42/0.1)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

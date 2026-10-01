import { cn } from 'cn'

export interface FilterOption<T> {
  value: T
  label: string
  count?: number
}

export function FilterTabs<T>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="-mb-px flex gap-5 overflow-x-auto">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.label}
            type="button"
            aria-pressed={active}
            onClick={() => {
              onChange(option.value)
            }}
            className={cn(
              'flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm whitespace-nowrap',
              active
                ? 'border-petrol-600 font-medium text-ink'
                : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={active ? 'text-ink-2' : 'text-ink-3'}>{option.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

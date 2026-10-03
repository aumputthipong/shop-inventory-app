import { cn } from 'cn'
import type { ReactNode } from 'react'

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {children}
      </label>
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : (
        hint && <span className="text-xs text-ink-3">{hint}</span>
      )}
    </div>
  )
}

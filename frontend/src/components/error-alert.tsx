import { cn } from 'cn'
import { AlertCircleIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function ErrorAlert({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-2 rounded-md bg-chip-bad px-3 py-2.5 text-[13px] text-chip-bad-fg',
        className,
      )}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

import { cn } from 'cn'
import { ChevronDownIcon, CircleHelpIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function HelpNote({
  question,
  children,
  className,
}: {
  question: string
  children: ReactNode
  className?: string
}) {
  return (
    <details className={cn('group text-[13px] text-ink-2', className)}>
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm font-medium text-petrol-600 hover:text-petrol-700 [&::-webkit-details-marker]:hidden">
        <CircleHelpIcon className="size-4" aria-hidden="true" />
        {question}
        <ChevronDownIcon
          className="size-3.5 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-2 flex flex-col gap-1.5 rounded-md border border-line bg-surface-2 px-3.5 py-3 leading-relaxed">
        {children}
      </div>
    </details>
  )
}

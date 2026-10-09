import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from 'cn'
import type { ReactNode } from 'react'

export function BackLink({ to, children }: { to: LinkProps['to']; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

// No z-index or clip-path here: either one lifts the band over the panels that overlap its foot
export function PageBand({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        '-mx-4 -mt-6 -mb-14 on-brand px-4 pt-6 pb-20 [border-image:linear-gradient(#2a3563_0_0)_fill_0//0_100vmax] md:-mx-6 md:px-6 xl:-mx-10 xl:-mt-8 xl:px-10 xl:pt-8',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function PageHeader({
  back,
  title,
  aside,
  description,
  actions,
  below,
  children,
}: {
  back?: { to: LinkProps['to']; label: string }
  title: ReactNode
  aside?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  below?: ReactNode
  children?: ReactNode
}) {
  return (
    <PageBand>
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="page-title">{title}</h1>
            {aside && <p className="text-sm text-ink-2">{aside}</p>}
          </div>
          {description && <p className="text-sm text-ink-2">{description}</p>}
          {children}
        </div>
        {actions}
      </div>
      {below}
    </PageBand>
  )
}

import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { cn } from 'cn'
import type { ReactNode } from 'react'

export function BackLink({ to, children }: { to: LinkProps['to']; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2 hover:text-ink"
    >
      <ArrowLeftIcon className="size-4" aria-hidden="true" />
      {children}
    </Link>
  )
}

export function PageBand({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        '-mx-4 -mt-6 on-brand px-4 pt-3 pb-4 [border-image:linear-gradient(#2a3563_0_0)_fill_0//0_100vmax] md:-mx-6 md:px-6 xl:-mx-10 xl:-mt-8 xl:px-10',
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
    <>
      <PageBand>
        {back && <BackLink to={back.to}>{back.label}</BackLink>}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="page-title">{title}</h1>
            {aside && <p className="text-sm text-ink-2">{aside}</p>}
          </div>
          {actions}
        </div>
      </PageBand>
      {(description ?? children) && (
        <div className="-mt-2">
          {description && <p className="text-sm text-ink-2">{description}</p>}
          {children}
        </div>
      )}
      {below}
    </>
  )
}

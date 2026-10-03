import { Link, type LinkProps } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
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

export function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  back?: { to: LinkProps['to']; label: string }
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div>
      {back && <BackLink to={back.to}>{back.label}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          {eyebrow && <p className="text-[13px] text-ink-2">{eyebrow}</p>}
          <h1 className="text-[22px] leading-[30px] font-semibold">{title}</h1>
          {description && <p className="text-sm text-ink-2">{description}</p>}
          {children}
        </div>
        {actions}
      </div>
    </div>
  )
}

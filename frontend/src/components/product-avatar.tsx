import { cn } from 'cn'

import { productInitial } from '@/lib/avatar'

export function ProductAvatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-sm border border-kraft-300 bg-kraft-50 font-semibold text-kraft-700',
        size === 'lg' ? 'size-12 text-xl' : 'size-9 text-base',
      )}
    >
      {productInitial(name)}
    </span>
  )
}

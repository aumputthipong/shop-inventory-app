import { cn } from 'cn'
import { SearchIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Input } from '@/components/ui/input'

export function SearchInput({
  className,
  inputClassName,
  ...props
}: ComponentProps<'input'> & { inputClassName?: string }) {
  return (
    <label className={cn('relative flex items-center', className)}>
      <SearchIcon
        className="pointer-events-none absolute left-2.5 size-4 text-ink-3"
        aria-hidden="true"
      />
      <Input type="search" className={cn('pl-8', inputClassName)} {...props} />
    </label>
  )
}

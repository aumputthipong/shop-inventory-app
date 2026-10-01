import { cn } from 'cn'

import { productInitial, productTone } from '@/lib/avatar'

export function ProductAvatar({
  name,
  sku,
  size = 'md',
}: {
  name: string
  sku: string
  size?: 'md' | 'lg'
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center font-semibold',
        size === 'lg' ? 'size-12 rounded-md text-xl' : 'size-9 rounded-md text-base',
        productTone(sku),
      )}
    >
      {productInitial(name)}
    </span>
  )
}

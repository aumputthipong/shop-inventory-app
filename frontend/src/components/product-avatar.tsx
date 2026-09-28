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
        'flex shrink-0 items-center justify-center font-bold',
        size === 'lg' ? 'size-14 rounded-2xl text-2xl' : 'size-11 rounded-xl text-lg',
        productTone(sku),
      )}
    >
      {productInitial(name)}
    </span>
  )
}

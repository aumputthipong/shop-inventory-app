import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-petrol-700',
        outline: 'border-line-strong bg-surface text-ink hover:bg-surface-2',
        secondary: 'bg-surface-2 text-ink hover:bg-line',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        destructive: 'bg-destructive text-white hover:bg-[#8e1f17]',
        link: 'text-petrol-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 rounded-md px-3.5 text-sm',
        sm: 'h-8 rounded-md px-2.5 text-[13px]',
        lg: 'h-10 rounded-md px-4 text-sm',
        icon: 'size-9 rounded-md',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

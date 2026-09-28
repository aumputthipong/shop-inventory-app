import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 border border-transparent bg-clip-padding font-semibold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-4 focus-visible:ring-petrol-100 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-petrol hover:bg-petrol-700',
        outline:
          'border-sand-400 bg-white text-ink shadow-[0_1px_2px_rgb(64_44_24/0.05)] hover:border-sand-500 hover:bg-sand-50',
        secondary: 'bg-sand-200 text-ink hover:bg-sand-300',
        ghost: 'text-sand-800 hover:bg-sand-100 hover:text-ink',
        destructive: 'bg-chip-bad text-chip-bad-fg hover:bg-[#f8d9d3]',
        link: 'text-petrol-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 rounded-xl px-4 text-[15px]',
        sm: 'h-9 rounded-lg px-3 text-sm',
        lg: 'h-12 rounded-[14px] px-5 text-base',
        icon: 'size-10 rounded-xl',
        'icon-sm': 'size-9 rounded-lg',
        'icon-lg': 'size-12 rounded-[14px]',
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

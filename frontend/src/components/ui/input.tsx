import * as React from 'react'
import { cn } from 'cn'

const fieldClass =
  'w-full rounded-xl border-[1.5px] border-sand-400 bg-white px-3.5 text-[15px] text-ink transition-colors placeholder:text-sand-700 hover:border-sand-500 focus:border-petrol-600 focus:ring-4 focus:ring-petrol-100 focus:outline-none disabled:opacity-50 aria-invalid:border-destructive'

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input data-slot="input" className={cn(fieldClass, 'h-11', className)} {...props} />
}

function NativeSelect({ className, ...props }: React.ComponentProps<'select'>) {
  return <select data-slot="select" className={cn(fieldClass, 'h-11', className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldClass, 'min-h-20 py-2.5', className)}
      {...props}
    />
  )
}

export { Input, NativeSelect, Textarea }

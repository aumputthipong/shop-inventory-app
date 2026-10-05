import * as React from 'react'
import { cn } from 'cn'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          'fixed top-1/2 left-1/2 z-50 grid max-h-[90vh] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-float outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-md text-ink-2 hover:bg-surface-2 hover:text-ink">
          <XIcon className="size-4" aria-hidden="true" />
          <span className="sr-only">ปิด</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5 pr-10">
      {icon && (
        <span
          aria-hidden="true"
          className="mt-1 flex size-5 shrink-0 items-center justify-center text-petrol-600 [&_svg]:size-5"
        >
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <DialogPrimitive.Title className="text-base leading-7 font-semibold">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="text-sm text-ink-2">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
        )}
      </div>
    </div>
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        '-mx-6 -mb-6 mt-2 flex items-center justify-end gap-2 border-t border-line px-6 py-3.5',
        className,
      )}
      {...props}
    />
  )
}

const DialogClose = DialogPrimitive.Close

export { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader }

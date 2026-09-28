import { CheckIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { ToastContext } from '@/lib/toast'

export function Toaster({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback((text: string) => {
    setMessage(text)
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (message === null) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setMessage(null)
    }, 4000)
    return () => {
      window.clearTimeout(timer.current)
    }
  }, [message, version])

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-8 z-[60] flex justify-center"
      >
        {message !== null && (
          <div
            key={version}
            className="animate-rise flex items-center gap-3 rounded-2xl bg-ink py-3.5 pr-5 pl-3.5 text-[15px] text-white shadow-[0_16px_40px_rgb(43_38_33/0.28)]"
          >
            <span className="flex size-[30px] items-center justify-center rounded-full bg-[#2f7d4f]">
              <CheckIcon className="size-4" strokeWidth={2.6} aria-hidden="true" />
            </span>
            {message}
          </div>
        )}
      </div>
    </ToastContext>
  )
}

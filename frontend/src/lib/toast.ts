import { createContext, use } from 'react'

export const ToastContext = createContext<(message: string) => void>(() => undefined)

export function useToast() {
  return use(ToastContext)
}

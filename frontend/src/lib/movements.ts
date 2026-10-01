import type { Movement } from '@/lib/api'

export const REVERSAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function canReverse(m: Movement, now = Date.now()): boolean {
  return (
    (m.type === 'STOCK_IN' || m.type === 'ADJUST') &&
    m.order_id === null &&
    m.count_id === null &&
    m.reverses_id === null &&
    !m.reversed &&
    m.qty_change !== 0 &&
    now - new Date(m.created_at).getTime() <= REVERSAL_WINDOW_MS
  )
}

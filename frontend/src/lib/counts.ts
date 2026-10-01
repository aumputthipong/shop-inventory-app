import type { CountLine } from '@/lib/api'

export function varianceTotals(lines: CountLine[]) {
  let added = 0
  let removed = 0
  let changed = 0
  for (const l of lines) {
    if (l.variance > 0) added += l.variance
    if (l.variance < 0) removed -= l.variance
    if (l.variance !== 0) changed += 1
  }
  return { added, removed, changed }
}

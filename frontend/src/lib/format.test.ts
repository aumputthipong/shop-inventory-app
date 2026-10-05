import { describe, expect, it } from 'vitest'

import { formatWaiting, hoursSince } from '@/lib/format'

describe('hoursSince', () => {
  const now = new Date('2026-10-05T12:00:00Z')

  it.each([
    ['2026-10-05T11:30:00Z', 0],
    ['2026-10-05T09:00:00Z', 3],
    ['2026-10-03T12:00:00Z', 48],
    ['2026-10-05T13:00:00Z', 0],
  ])('%s is %i hours ago', (iso, want) => {
    expect(hoursSince(iso, now)).toBe(want)
  })
})

describe('formatWaiting', () => {
  it.each([
    [0, 'รอไม่ถึง 1 ชม.'],
    [5, 'รอ 5 ชม.'],
    [23, 'รอ 23 ชม.'],
    [24, 'รอ 1 วัน'],
    [71, 'รอ 2 วัน'],
  ])('%i hours reads %s', (hours, want) => {
    expect(formatWaiting(hours)).toBe(want)
  })
})

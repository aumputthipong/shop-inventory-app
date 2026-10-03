import { describe, expect, it } from 'vitest'

import { parseOffset } from '@/lib/search-params'

describe('parseOffset', () => {
  it.each<[unknown, number | undefined]>([
    [20, 20],
    ['40', 40],
    [0, undefined],
    [-5, undefined],
    ['abc', undefined],
    [undefined, undefined],
  ])('%s -> %s', (raw, want) => {
    expect(parseOffset(raw)).toBe(want)
  })
})

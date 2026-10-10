import { describe, expect, it } from 'vitest'

import { activeNavPath, navGroupsFor } from '@/lib/nav'

describe('activeNavPath', () => {
  it.each([
    { pathname: '/', want: '/' },
    { pathname: '/orders', want: '/orders' },
    { pathname: '/orders/12', want: '/orders' },
    { pathname: '/orders/new', want: '/orders/new' },
    { pathname: '/orders/online/', want: '/orders/online' },
    { pathname: '/counts/new', want: '/counts' },
    { pathname: '/counts/3', want: '/counts' },
    { pathname: '/stock', want: '/stock' },
    { pathname: '/account', want: undefined },
    { pathname: '/stockroom', want: undefined },
  ])('$pathname is $want', ({ pathname, want }) => {
    expect(activeNavPath(pathname)).toBe(want)
  })
})

describe('navGroupsFor', () => {
  it('keeps shop management for the owner only', () => {
    const labels = (isOwner: boolean) => navGroupsFor(isOwner).map((g) => g.label)

    expect(labels(true)).toContain('จัดการร้าน')
    expect(labels(false)).not.toContain('จัดการร้าน')
  })
})

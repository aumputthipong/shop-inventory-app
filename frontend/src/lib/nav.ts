export type NavPath =
  | '/'
  | '/orders'
  | '/orders/new'
  | '/orders/online'
  | '/stock'
  | '/receive'
  | '/counts'
  | '/ledger'
  | '/team'
  | '/audit'

export interface NavItem {
  to: NavPath
  label: string
}

export interface NavGroup {
  label?: string
  ownerOnly?: boolean
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/', label: 'วันนี้' }] },
  {
    label: 'งานขาย',
    items: [
      { to: '/orders', label: 'ออเดอร์' },
      { to: '/orders/new', label: 'ขายหน้าร้าน' },
      { to: '/orders/online', label: 'คีย์ออเดอร์ออนไลน์' },
    ],
  },
  {
    label: 'คลังสินค้า',
    items: [
      { to: '/stock', label: 'สต็อก' },
      { to: '/receive', label: 'รับของเข้า' },
      { to: '/counts', label: 'ตรวจนับ' },
      { to: '/ledger', label: 'ประวัติสต็อก' },
    ],
  },
  {
    label: 'จัดการร้าน',
    ownerOnly: true,
    items: [
      { to: '/team', label: 'ทีม' },
      { to: '/audit', label: 'บันทึกการใช้งาน' },
    ],
  },
]

export function navGroupsFor(isOwner: boolean): NavGroup[] {
  return NAV_GROUPS.filter((group) => !group.ownerOnly || isOwner)
}

// The longest whole-segment match wins, so /orders/new is not also ออเดอร์.
export function activeNavPath(pathname: string): NavPath | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  let best: NavPath | undefined
  for (const group of NAV_GROUPS) {
    for (const { to } of group.items) {
      const matches = path === to || (to !== '/' && path.startsWith(`${to}/`))
      if (matches && (best === undefined || to.length > best.length)) best = to
    }
  }
  return best
}

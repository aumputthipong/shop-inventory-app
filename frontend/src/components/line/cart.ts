import type { LineCatalogItem } from '@/lib/api'

const MAX_PER_ITEM = 20

export type Cart = Record<number, number>

export interface CartLine {
  item: LineCatalogItem
  qty: number
}

export function capFor(item: LineCatalogItem): number {
  return Math.min(MAX_PER_ITEM, item.available ?? MAX_PER_ITEM)
}

export function cartLines(items: LineCatalogItem[], cart: Cart): CartLine[] {
  return items.flatMap((item) => {
    const qty = cart[item.id] ?? 0
    return qty > 0 ? [{ item, qty }] : []
  })
}

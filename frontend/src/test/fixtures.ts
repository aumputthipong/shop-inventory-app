import type { Movement, OrderPage, OrderSummary, Product } from '@/lib/api'

export function product(overrides: Partial<Product> = {}): Product {
  const id = overrides.id ?? 1
  const onHand = overrides.on_hand ?? 10
  const reserved = overrides.reserved ?? 0
  return {
    id,
    sku: `SKU-${String(id).padStart(4, '0')}`,
    name: 'เสื้อยืด',
    price: '100.00',
    low_stock_threshold: 5,
    is_active: true,
    on_hand: onHand,
    reserved,
    available: onHand - reserved,
    stock_status: 'in_stock',
    created_at: '2026-09-28T08:00:00Z',
    updated_at: '2026-09-28T08:00:00Z',
    ...overrides,
  }
}

export function orderSummary(overrides: Partial<OrderSummary> = {}): OrderSummary {
  const id = overrides.id ?? 1
  return {
    id,
    order_no: `ORD-2026-${String(id).padStart(5, '0')}`,
    channel: 'shopee',
    external_ref: null,
    status: 'reserved',
    total: '100.00',
    item_count: 2,
    created_by_name: 'พลอย',
    created_at: '2026-09-30T08:00:00Z',
    customer_name: null,
    lines: [{ name: 'เสื้อยืด', qty: 2 }],
    ...overrides,
  }
}

export function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: 1,
    product_id: 1,
    sku: 'SKU-0001',
    product_name: 'เสื้อยืด',
    type: 'STOCK_IN',
    qty_change: 10,
    reserved_change: 0,
    on_hand_after: 10,
    reserved_after: 0,
    available_after: 10,
    order_id: null,
    order_no: null,
    order_channel: null,
    count_id: null,
    receipt_id: null,
    receipt_reference: null,
    reason: null,
    note: null,
    created_by_name: 'พลอย',
    created_at: '2026-09-30T08:00:00Z',
    reverses_id: null,
    reversed: false,
    ...overrides,
  }
}

export function orderPage(items: OrderSummary[], total = items.length): OrderPage {
  return {
    items,
    total,
    status_counts: { reserved: 0, packed: 0, shipped: 0, canceled: 0 },
  }
}

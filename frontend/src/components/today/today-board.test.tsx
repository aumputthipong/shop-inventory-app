import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TodayBoard } from '@/components/today/today-board'
import { api, type OrderSummary, type Product } from '@/lib/api'

function order(id: number, status: OrderSummary['status']): OrderSummary {
  return {
    id,
    order_no: `ORD-2026-0000${id}`,
    channel: 'shopee',
    external_ref: null,
    status,
    total: '100.00',
    item_count: 2,
    created_by_name: 'พลอย',
    created_at: '2026-09-30T08:00:00Z',
  }
}

function product(id: number, name: string, available: number, status: Product['stock_status']) {
  return {
    id,
    sku: `SKU-000${id}`,
    name,
    price: '100.00',
    low_stock_threshold: 5,
    is_active: true,
    on_hand: available,
    reserved: 0,
    available,
    stock_status: status,
    created_at: '2026-09-28T08:00:00Z',
    updated_at: '2026-09-28T08:00:00Z',
  } satisfies Product
}

function renderBoard(isOwner: boolean) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    routeTree: createRootRoute({ component: () => <TodayBoard isOwner={isOwner} /> }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('TodayBoard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listOrders').mockImplementation((query) =>
      Promise.resolve(
        query.status === 'reserved'
          ? { items: [order(1, 'reserved'), order(2, 'reserved')], total: 2 }
          : { items: [], total: 0 },
      ),
    )
    vi.spyOn(api, 'listProducts').mockResolvedValue([
      product(1, 'เสื้อยืด', 20, 'in_stock'),
      product(2, 'แก้วน้ำ', 0, 'out_of_stock'),
      product(3, 'หมวก', 2, 'low'),
    ])
  })

  it('lists what needs doing today', async () => {
    const counts = vi.spyOn(api, 'listCounts').mockResolvedValue({ items: [], total: 0 })
    renderBoard(true)

    expect(await screen.findByText('ORD-2026-00001')).toBeInTheDocument()
    expect(screen.getByLabelText('ต้องแพ็ก 2')).toBeInTheDocument()
    expect(screen.getByLabelText('รอส่ง 0')).toBeInTheDocument()
    expect(screen.getByText('ไม่มีออเดอร์ค้าง')).toBeInTheDocument()

    const restock = screen.getAllByRole('link', { name: /แก้วน้ำ|หมวก/ })
    expect(restock.map((l) => l.textContent)).toEqual(['แก้วน้ำ', 'หมวก'])
    expect(counts).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'submitted' }),
      expect.anything(),
    )
  })

  it('hides count approvals from staff', async () => {
    const counts = vi.spyOn(api, 'listCounts')
    renderBoard(false)

    expect(await screen.findByText('ORD-2026-00001')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'ผลนับรอยืนยัน' })).not.toBeInTheDocument()
    expect(counts).not.toHaveBeenCalled()
  })
})

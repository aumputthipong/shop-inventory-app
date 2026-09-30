import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReceiveForm } from '@/components/stock/receive-form'
import { api, type Product } from '@/lib/api'

function product(id: number, name: string, onHand: number): Product {
  return {
    id,
    sku: `SKU-000${id}`,
    name,
    price: '100.00',
    low_stock_threshold: 5,
    is_active: true,
    on_hand: onHand,
    reserved: 0,
    available: onHand,
    stock_status: 'in_stock',
    created_at: '2026-09-28T08:00:00Z',
    updated_at: '2026-09-28T08:00:00Z',
  }
}

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <ReceiveForm products={[product(1, 'เสื้อยืด', 4), product(2, 'แก้วน้ำ', 0)]} />
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

describe('ReceiveForm', () => {
  it('receives several products from one delivery note at once', async () => {
    const receive = vi.spyOn(api, 'receiveStock').mockResolvedValue({
      id: 7,
      reference: 'INV-12',
      note: null,
      created_at: '2026-09-30T08:00:00Z',
      lines: [
        {
          product_id: 1,
          sku: 'SKU-0001',
          name: 'เสื้อยืด',
          qty: 3,
          on_hand: 7,
          reserved: 0,
          available: 7,
        },
        {
          product_id: 2,
          sku: 'SKU-0002',
          name: 'แก้วน้ำ',
          qty: 1,
          on_hand: 1,
          reserved: 0,
          available: 1,
        },
      ],
    })
    const user = userEvent.setup()
    renderForm()

    await user.click(await screen.findByRole('button', { name: 'เพิ่ม เสื้อยืด' }))
    await user.click(screen.getByRole('button', { name: 'เพิ่ม แก้วน้ำ' }))
    const qty = screen.getAllByRole('textbox').find((el) => el.id === 'receive-1')
    if (!qty) throw new Error('missing qty input')
    await user.clear(qty)
    await user.type(qty, '3')
    await user.type(screen.getByRole('textbox', { name: 'เลขที่ใบส่งของ (ไม่ใส่ก็ได้)' }), 'INV-12')

    expect(screen.getByText('มีอยู่ 4 ชิ้น → 7 ชิ้น')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'รับของเข้า 2 รายการ รวม 4 ชิ้น' }))

    expect(receive).toHaveBeenCalledWith({
      reference: 'INV-12',
      note: undefined,
      lines: [
        { product_id: 1, qty: 3 },
        { product_id: 2, qty: 1 },
      ],
    })
    expect(await screen.findByText(/รับของเข้าแล้ว 2 รายการ/)).toBeInTheDocument()
  })

  it('waits until a product is picked', async () => {
    renderForm()

    expect(await screen.findByRole('button', { name: 'รับของเข้า' })).toBeDisabled()
  })
})

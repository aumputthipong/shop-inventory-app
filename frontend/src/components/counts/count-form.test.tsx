import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CountForm } from '@/components/counts/count-form'
import { ApiError, api, type Product, type StockCount } from '@/lib/api'

function product(id: number, name: string, onHand: number, reserved = 0): Product {
  return {
    id,
    sku: `SKU-000${id}`,
    name,
    price: '100.00',
    low_stock_threshold: 5,
    is_active: true,
    on_hand: onHand,
    reserved,
    available: onHand - reserved,
    stock_status: 'in_stock',
    created_at: '2026-09-28T08:00:00Z',
    updated_at: '2026-09-28T08:00:00Z',
  }
}

const products = [product(1, 'เสื้อยืด', 10), product(2, 'แก้วน้ำ', 6, 4)]

function renderForm(isOwner: boolean, onSaved = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <CountForm products={products} isOwner={isOwner} onSaved={onSaved} />
    </QueryClientProvider>,
  )
  return onSaved
}

describe('CountForm', () => {
  it('sends only the products that were counted', async () => {
    const create = vi.spyOn(api, 'createCount').mockResolvedValue({ id: 3 } as StockCount)
    const user = userEvent.setup()
    const onSaved = renderForm(false)

    await user.type(screen.getByRole('textbox', { name: 'นับได้ เสื้อยืด' }), '8')

    expect(screen.getByText('−2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ส่งให้เจ้าของร้านยืนยัน' }))

    expect(create).toHaveBeenCalledWith({
      approve: false,
      note: undefined,
      lines: [{ product_id: 1, counted: 8 }],
    })
    expect(onSaved).toHaveBeenCalled()
  })

  it('lets an owner mark a product as matching and apply at once', async () => {
    const create = vi.spyOn(api, 'createCount').mockResolvedValue({ id: 4 } as StockCount)
    const user = userEvent.setup()
    renderForm(true)

    await user.click(screen.getByRole('button', { name: 'ตรงกับระบบ แก้วน้ำ' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกและปรับสต็อก' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ approve: true, lines: [{ product_id: 2, counted: 6 }] }),
    )
  })

  it('explains when a count would take units that orders hold', async () => {
    vi.spyOn(api, 'createCount').mockRejectedValue(
      new ApiError(409, {
        error: {
          code: 'insufficient_stock',
          message: 'short',
          details: {
            items: [
              { product_id: 2, sku: 'SKU-0002', name: 'แก้วน้ำ', requested: 5, available: 2 },
            ],
          },
        },
      }),
    )
    const user = userEvent.setup()
    renderForm(true)

    await user.type(screen.getByRole('textbox', { name: 'นับได้ แก้วน้ำ' }), '1')
    await user.click(screen.getByRole('button', { name: 'บันทึกและปรับสต็อก' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('แก้วน้ำ ลดได้อีกไม่เกิน 2 ชิ้น')
  })

  it('keeps the save button off until something is counted', () => {
    renderForm(false)

    expect(screen.getByRole('button', { name: 'ส่งให้เจ้าของร้านยืนยัน' })).toBeDisabled()
  })
})

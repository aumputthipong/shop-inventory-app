import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CountForm } from '@/components/counts/count-form'
import { ApiError, api, type StockCount } from '@/lib/api'
import { product } from '@/test/fixtures'
import { renderWithQuery } from '@/test/render'

const products = [
  product({ id: 1, name: 'เสื้อยืด', on_hand: 10 }),
  product({ id: 2, name: 'แก้วน้ำ', on_hand: 6, reserved: 4 }),
]

function renderForm(isOwner: boolean, onSaved = vi.fn()) {
  renderWithQuery(<CountForm products={products} isOwner={isOwner} onSaved={onSaved} />)
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

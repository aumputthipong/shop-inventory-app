import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProductFormDialog } from '@/components/stock/product-form-dialog'
import { api, type ProductDetail } from '@/lib/api'
import { renderWithQuery } from '@/test/render'

function renderNewProduct() {
  return renderWithQuery(<ProductFormDialog open onOpenChange={() => undefined} />)
}

describe('ProductFormDialog', () => {
  it('creates a product with the stock the shop already has', async () => {
    const create = vi
      .spyOn(api, 'createProduct')
      .mockResolvedValue({ id: 9, name: 'ไดร์เป่าผม', on_hand: 12 } as ProductDetail)
    const user = userEvent.setup()
    renderNewProduct()

    await user.type(screen.getByLabelText('ชื่อสินค้า'), 'ไดร์เป่าผม')
    await user.type(screen.getByLabelText('SKU'), 'SKU-0005')
    await user.type(screen.getByLabelText('ราคา (บาท)'), '899')
    await user.type(screen.getByLabelText('จำนวนที่มีตอนนี้ (ชิ้น)'), '12')
    await user.click(screen.getByRole('button', { name: 'เพิ่มสินค้า' }))

    expect(create).toHaveBeenCalledWith({
      sku: 'SKU-0005',
      name: 'ไดร์เป่าผม',
      price: '899',
      low_stock_threshold: 5,
      initial_qty: 12,
    })
  })

  it('treats a blank opening quantity as zero', async () => {
    const create = vi
      .spyOn(api, 'createProduct')
      .mockResolvedValue({ id: 9, name: 'แก้วน้ำ', on_hand: 0 } as ProductDetail)
    const user = userEvent.setup()
    renderNewProduct()

    await user.type(screen.getByLabelText('ชื่อสินค้า'), 'แก้วน้ำ')
    await user.type(screen.getByLabelText('SKU'), 'SKU-0006')
    await user.type(screen.getByLabelText('ราคา (บาท)'), '59')
    await user.click(screen.getByRole('button', { name: 'เพิ่มสินค้า' }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ initial_qty: 0 }))
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AdjustDialog } from '@/components/stock/adjust-dialog'
import { api } from '@/lib/api'
import { product } from '@/test/fixtures'
import { renderWithQuery } from '@/test/render'

const jeans = product({
  id: 2,
  name: 'กางเกงยีนส์ขายาว 32',
  price: '600.00',
  on_hand: 8,
  reserved: 5,
  stock_status: 'low',
})

function renderDialog() {
  return renderWithQuery(<AdjustDialog product={jeans} open onOpenChange={() => undefined} />)
}

describe('AdjustDialog', () => {
  it('will not remove units that orders are holding', async () => {
    const user = userEvent.setup()
    renderDialog()

    const qty = screen.getByRole('textbox', { name: 'จำนวน' })
    await user.clear(qty)
    await user.type(qty, '4')
    await user.selectOptions(screen.getByRole('combobox', { name: 'เหตุผล' }), 'damaged')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'ลดได้สูงสุด 3 ชิ้น อีก 5 ชิ้นถูกจองไว้ให้ออเดอร์แล้ว',
    )
    expect(screen.getByRole('button', { name: 'ลด 4 ชิ้นออกจากสต็อก' })).toBeDisabled()
  })

  it('asks for a reason before saving', () => {
    renderDialog()

    expect(screen.getByText('เลือกเหตุผลก่อนนะ')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ลด 1 ชิ้นออกจากสต็อก' })).toBeDisabled()
  })

  it('needs a note when the reason is other', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.selectOptions(screen.getByRole('combobox', { name: 'เหตุผล' }), 'other')

    expect(screen.getByText('เล่าสั้นๆ ว่าเกิดอะไรขึ้น')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ลด 1 ชิ้นออกจากสต็อก' })).toBeDisabled()
  })

  it('sends a negative change with the chosen reason', async () => {
    const adjust = vi
      .spyOn(api, 'adjustStock')
      .mockResolvedValue({ product_id: 2, on_hand: 6, reserved: 5, available: 1 })
    const user = userEvent.setup()
    renderDialog()

    const qty = screen.getByRole('textbox', { name: 'จำนวน' })
    await user.clear(qty)
    await user.type(qty, '2')
    await user.selectOptions(screen.getByRole('combobox', { name: 'เหตุผล' }), 'damaged')
    await user.type(screen.getByRole('textbox', { name: 'โน้ต (ไม่ใส่ก็ได้)' }), 'ตะเข็บขาด')
    await user.click(screen.getByRole('button', { name: 'ลด 2 ชิ้นออกจากสต็อก' }))

    expect(adjust).toHaveBeenCalledWith(2, {
      qty_change: -2,
      reason: 'damaged',
      note: 'ตะเข็บขาด',
    })
  })

  it('turns a counted quantity into the difference', async () => {
    const adjust = vi
      .spyOn(api, 'adjustStock')
      .mockResolvedValue({ product_id: 2, on_hand: 6, reserved: 5, available: 1 })
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'นับได้จริง' }))
    await user.type(screen.getByRole('textbox', { name: 'นับได้จริง (ชิ้น)' }), '6')
    await user.click(screen.getByRole('button', { name: 'ตั้งยอดเป็น 6 ชิ้น' }))

    expect(adjust).toHaveBeenCalledWith(2, {
      qty_change: -2,
      reason: 'count_correction',
      note: '',
    })
  })

  it('will not count below what orders hold', async () => {
    const user = userEvent.setup()
    renderDialog()

    await user.click(screen.getByRole('button', { name: 'นับได้จริง' }))
    await user.type(screen.getByRole('textbox', { name: 'นับได้จริง (ชิ้น)' }), '4')

    expect(screen.getByRole('alert')).toHaveTextContent('นับได้น้อยกว่าของที่ถูกจองไว้ 5 ชิ้น')
    expect(screen.getByRole('button', { name: 'ตั้งยอดเป็น 4 ชิ้น' })).toBeDisabled()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { NewOrderForm } from '@/components/orders/new-order-form'
import { api, type Order } from '@/lib/api'
import type { EntryMode } from '@/lib/order-entry'
import { orderPage, orderSummary, product } from '@/test/fixtures'
import { renderWithRouter } from '@/test/render'

const shirt = product({ id: 1, name: 'เสื้อยืด' })

const created: Order = {
  id: 12,
  order_no: 'ORD-2026-00012',
  channel: 'shopee',
  external_ref: '2410ABC',
  status: 'reserved',
  total: '100.00',
  note: null,
  created_by_name: 'พลอย',
  created_at: '2026-10-04T08:00:00Z',
  updated_at: '2026-10-04T08:00:00Z',
  packed_at: null,
  shipped_at: null,
  canceled_at: null,
  items: [],
  customer: null,
}

async function startCart(mode: EntryMode) {
  const user = userEvent.setup()
  renderWithRouter(<NewOrderForm products={[shirt]} mode={mode} />)
  await user.click(await screen.findByRole('button', { name: 'ใส่ เสื้อยืด ลงตะกร้า' }))
  return user
}

describe('NewOrderForm in the store', () => {
  it('stops adding once the cart holds every unit that can be sold', async () => {
    const user = userEvent.setup()
    const lastTwo = product({ id: 2, name: 'หมวก', on_hand: 2, stock_status: 'low' })
    renderWithRouter(<NewOrderForm products={[lastTwo]} mode="store" />)

    const add = await screen.findByRole('button', { name: 'ใส่ หมวก ลงตะกร้า' })
    expect(screen.getByText('เหลือ 2 ชิ้น')).toBeInTheDocument()
    await user.click(add)
    await user.click(screen.getByRole('button', { name: 'เพิ่มจำนวน' }))

    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เพิ่มจำนวน' })).toBeDisabled()
    expect(add).toBeDisabled()
  })

  it('hands the goods over by default', async () => {
    const create = vi.spyOn(api, 'createOrder').mockResolvedValue({ ...created, status: 'shipped' })
    const user = await startCart('store')

    expect(screen.getByText('ตัดของ 1 ชิ้นออกจากคลังทันที')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'บันทึกการขาย' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'store', handed_over: true }),
    )
  })

  it('asks who comes back for goods kept for later', async () => {
    const user = await startCart('store')

    await user.click(screen.getByRole('button', { name: 'เก็บไว้ให้ มารับทีหลัง' }))
    const save = screen.getByRole('button', { name: 'บันทึกและเก็บของไว้ให้' })
    expect(save).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'เบอร์โทร' }), '0812345678')
    expect(save).toBeEnabled()
    expect(screen.getByText(/จองของ 1 ชิ้นไว้ให้ 0812345678/)).toBeInTheDocument()
  })
})

describe('NewOrderForm for online orders', () => {
  it('makes staff pick the channel first', async () => {
    await startCart('online')

    expect(screen.getByText('เลือกก่อนว่าลูกค้าสั่งมาทาง Shopee หรือ LINE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'บันทึกออเดอร์' })).toBeDisabled()
  })

  it('stops a Shopee order that was already keyed in', async () => {
    vi.spyOn(api, 'listOrders').mockResolvedValue(
      orderPage([orderSummary({ id: 5, channel: 'shopee', external_ref: '2410ABC' })]),
    )
    const user = await startCart('online')

    await user.click(screen.getByRole('button', { name: /Shopee/ }))
    await user.type(screen.getByRole('textbox', { name: 'เลขออเดอร์ Shopee' }), '2410ABC')
    await user.tab()

    expect(await screen.findByRole('link', { name: 'ORD-2026-00005' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'บันทึกออเดอร์' })).toBeDisabled()
  })

  it('keeps the channel and clears the cart for the next order', async () => {
    vi.spyOn(api, 'listOrders').mockResolvedValue(orderPage([]))
    const create = vi.spyOn(api, 'createOrder').mockResolvedValue(created)
    const user = await startCart('online')

    await user.click(screen.getByRole('button', { name: /Shopee/ }))
    await user.type(screen.getByRole('textbox', { name: 'เลขออเดอร์ Shopee' }), ' 2410ABC ')
    await user.click(screen.getByRole('button', { name: 'บันทึกออเดอร์' }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'shopee', external_ref: '2410ABC' }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent('ORD-2026-00012')
    expect(screen.getByRole('button', { name: /Shopee/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('textbox', { name: 'เลขออเดอร์ Shopee' })).toHaveValue('')
    expect(screen.getByText(/ยังไม่มีสินค้าในตะกร้า/)).toBeInTheDocument()
  })

  it('needs the customer name for a LINE chat order', async () => {
    const user = await startCart('online')

    await user.click(screen.getByRole('button', { name: /LINE/ }))
    expect(screen.getByRole('button', { name: 'บันทึกออเดอร์' })).toBeDisabled()

    await user.type(screen.getByRole('textbox', { name: 'ชื่อลูกค้า' }), 'มะลิ')
    expect(screen.getByRole('button', { name: 'บันทึกออเดอร์' })).toBeEnabled()
  })
})

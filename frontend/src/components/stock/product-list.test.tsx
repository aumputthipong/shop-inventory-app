import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProductList } from '@/components/stock/product-list'
import { product } from '@/test/fixtures'

const products = [
  product({ name: 'เสื้อยืดคอกลม สีขาว M', price: '290.00', on_hand: 24, reserved: 6 }),
  product({
    id: 2,
    sku: 'SKU-0002',
    name: 'กางเกงยีนส์ขายาว 32',
    on_hand: 8,
    reserved: 5,
    available: 3,
    stock_status: 'low',
  }),
  product({
    id: 3,
    sku: 'SKU-0003',
    name: 'หมวกแก๊ป สีดำ',
    on_hand: 4,
    reserved: 4,
    available: 0,
    stock_status: 'out_of_stock',
  }),
]

describe('ProductList', () => {
  it('filters to products that need restocking', async () => {
    const user = userEvent.setup()
    render(<ProductList products={products} selectedId={1} onSelect={vi.fn()} />)

    const tabs = screen.getByRole('group', { name: 'แสดงสินค้า' })
    await user.click(within(tabs).getByRole('button', { name: /ใกล้หมด/ }))

    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('button')).toHaveLength(1)
    expect(within(list).getByText('กางเกงยีนส์ขายาว 32')).toBeInTheDocument()
  })

  it('searches by sku and offers a way back when nothing matches', async () => {
    const user = userEvent.setup()
    render(<ProductList products={products} selectedId={1} onSelect={vi.fn()} />)

    await user.type(screen.getByRole('searchbox', { name: 'ค้นหาชื่อหรือ SKU' }), 'ไดร์เป่าผม')

    expect(screen.getByText('ไม่เจอสินค้า “ไดร์เป่าผม”')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ล้างคำค้นหา' }))
    expect(screen.getByText('แสดง 3 จาก 3 รายการ')).toBeInTheDocument()
  })

  it('invites the owner to add the first product when the shop is empty', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ProductList products={[]} selectedId={undefined} onSelect={vi.fn()} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: 'เพิ่มสินค้าชิ้นแรก' }))

    expect(onAdd).toHaveBeenCalled()
  })

  it('reports the selected product', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<ProductList products={products} selectedId={1} onSelect={onSelect} />)

    await user.click(screen.getByText('หมวกแก๊ป สีดำ'))

    expect(onSelect).toHaveBeenCalledWith(3)
  })

  it('walks a new owner through getting started', () => {
    render(<ProductList products={[]} selectedId={undefined} onSelect={vi.fn()} onAdd={vi.fn()} />)

    const steps = within(screen.getByRole('list', { name: 'เริ่มต้นใช้งาน' })).getAllByRole(
      'listitem',
    )
    expect(steps).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'เพิ่มสินค้าชิ้นแรก' })).toBeInTheDocument()
  })

  it('tells staff to wait for the owner when the shop is empty', () => {
    render(<ProductList products={[]} selectedId={undefined} onSelect={vi.fn()} />)

    expect(
      screen.getByText('ให้เจ้าของร้านเพิ่มสินค้าก่อน แล้วรายการจะขึ้นที่นี่'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'เริ่มต้นใช้งาน' })).not.toBeInTheDocument()
  })
})

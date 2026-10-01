import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LineShop } from '@/components/line/line-shop'
import { ApiError, api, type LineCatalogItem } from '@/lib/api'
import type { LineIdentity } from '@/lib/line-identity'

const catalog: LineCatalogItem[] = [
  { id: 1, name: 'เสื้อยืด', price: '290.00', stock_status: 'in_stock', available: null },
  { id: 2, name: 'กางเกง', price: '600.00', stock_status: 'low', available: 2 },
  { id: 3, name: 'หมวก', price: '250.00', stock_status: 'out_of_stock', available: null },
]

const identity: LineIdentity = {
  idToken: 'dev:พลอย',
  displayName: 'พลอย',
  inClient: false,
  close: () => undefined,
}

function renderShop() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <LineShop identity={identity} devMode />
    </QueryClientProvider>,
  )
}

async function fillCartAndAddress(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'เพิ่ม เสื้อยืด' }))
  await user.click(screen.getByRole('button', { name: 'เพิ่ม เสื้อยืด อีก' }))
  await user.click(screen.getByRole('button', { name: 'เพิ่ม กางเกง' }))
  await user.click(screen.getByRole('button', { name: 'ถัดไป' }))
  await user.type(screen.getByRole('textbox', { name: 'เบอร์โทร' }), '0812345678')
  await user.type(screen.getByRole('textbox', { name: 'ที่อยู่จัดส่ง' }), '12 สุขุมวิท กรุงเทพ')
}

describe('LineShop', () => {
  beforeEach(() => {
    vi.spyOn(api, 'lineCatalog').mockResolvedValue(catalog)
  })

  it('shows what is left only when stock runs low and blocks sold-out items', async () => {
    renderShop()

    expect(await screen.findByText(/เหลือ 2 ชิ้น/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'เพิ่ม หมวก' })).toBeDisabled()
  })

  it('will not add more than is left', async () => {
    const user = userEvent.setup()
    renderShop()

    await user.click(await screen.findByRole('button', { name: 'เพิ่ม กางเกง' }))
    await user.click(screen.getByRole('button', { name: 'เพิ่ม กางเกง อีก' }))

    expect(screen.getByLabelText('จำนวน กางเกง')).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: 'เพิ่ม กางเกง อีก' })).toBeDisabled()
  })

  it('sends the cart with the LINE sign-in and shows the order number', async () => {
    const place = vi.spyOn(api, 'placeLineOrder').mockResolvedValue({
      order_no: 'ORD-2026-00042',
      status: 'reserved',
      total: '1180.00',
      items: [
        { name: 'เสื้อยืด', qty: 2, unit_price: '290.00' },
        { name: 'กางเกง', qty: 1, unit_price: '600.00' },
      ],
    })
    const user = userEvent.setup()
    renderShop()

    await fillCartAndAddress(user)
    expect(screen.getByRole('textbox', { name: 'ชื่อผู้รับ' })).toHaveValue('พลอย')
    await user.click(screen.getByRole('button', { name: 'ยืนยันสั่งซื้อ' }))

    expect(place).toHaveBeenCalledWith({
      id_token: 'dev:พลอย',
      name: 'พลอย',
      phone: '0812345678',
      address: '12 สุขุมวิท กรุงเทพ',
      note: undefined,
      items: [
        { product_id: 1, qty: 2 },
        { product_id: 2, qty: 1 },
      ],
    })
    expect(await screen.findByText('ORD-2026-00042')).toBeInTheDocument()
  })

  it('goes back to the cart and explains when someone else bought the last one', async () => {
    vi.spyOn(api, 'placeLineOrder').mockRejectedValue(
      new ApiError(409, {
        error: {
          code: 'insufficient_stock',
          message: 'sold out',
          details: { items: [{ product_id: 2, name: 'กางเกง', requested: 1, available: 0 }] },
        },
      }),
    )
    const user = userEvent.setup()
    renderShop()

    await fillCartAndAddress(user)
    await user.click(screen.getByRole('button', { name: 'ยืนยันสั่งซื้อ' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('กางเกง หมดแล้ว')
    expect(screen.queryByLabelText('จำนวน กางเกง')).not.toBeInTheDocument()
    expect(screen.getByLabelText('จำนวน เสื้อยืด')).toHaveTextContent('2')
  })
})

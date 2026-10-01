import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReverseMovementButton } from '@/components/stock/reverse-movement'
import { ApiError, api, type Movement } from '@/lib/api'
import { canReverse } from '@/lib/movements'

const now = new Date('2026-10-01T12:00:00Z').getTime()

const stockIn: Movement = {
  id: 41,
  product_id: 2,
  sku: 'SKU-0002',
  product_name: 'กางเกงยีนส์ขายาว 32',
  type: 'STOCK_IN',
  qty_change: 50,
  reserved_change: 0,
  on_hand_after: 58,
  reserved_after: 5,
  available_after: 53,
  order_id: null,
  order_no: null,
  order_channel: null,
  count_id: null,
  receipt_id: null,
  receipt_reference: null,
  reason: null,
  note: null,
  created_by_name: 'พลอย',
  created_at: '2026-10-01T09:00:00Z',
  reverses_id: null,
  reversed: false,
}

describe('canReverse', () => {
  it.each<[string, Partial<Movement>, boolean]>([
    ['a fresh stock-in', {}, true],
    ['an adjustment', { type: 'ADJUST', qty_change: -2 }, true],
    ['already reversed', { reversed: true }, false],
    ['a reversal itself', { type: 'ADJUST', reverses_id: 12 }, false],
    ['an order movement', { type: 'SHIP', order_id: 7 }, false],
    ['a stock count correction', { type: 'ADJUST', count_id: 3 }, false],
    ['older than 7 days', { created_at: '2026-09-23T09:00:00Z' }, false],
  ])('%s', (_, change, want) => {
    expect(canReverse({ ...stockIn, ...change }, now)).toBe(want)
  })
})

function renderButton() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ReverseMovementButton movement={stockIn} />
    </QueryClientProvider>,
  )
}

describe('ReverseMovementButton', () => {
  it('asks before reversing and then calls the api', async () => {
    const reverse = vi
      .spyOn(api, 'reverseMovement')
      .mockResolvedValue({ product_id: 2, on_hand: 8, reserved: 5, available: 3 })
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    expect(screen.getByText('รับเข้า +50 ชิ้น')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ยกเลิกรายการนี้' }))

    expect(reverse).toHaveBeenCalledWith(41)
  })

  it('explains when orders already hold the units', async () => {
    vi.spyOn(api, 'reverseMovement').mockRejectedValue(
      new ApiError(409, {
        error: {
          code: 'insufficient_stock',
          message: 'not enough available stock',
          details: { requested: 50, available: 3, reserved: 5 },
        },
      }),
    )
    const user = userEvent.setup()
    renderButton()

    await user.click(screen.getByRole('button', { name: 'ยกเลิก' }))
    await user.click(screen.getByRole('button', { name: 'ยกเลิกรายการนี้' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('ตอนนี้ขายได้เหลือ 3 ชิ้น')
  })
})

import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TodayBoard } from '@/components/today/today-board'
import { api } from '@/lib/api'
import { orderSummary, product } from '@/test/fixtures'
import { renderWithRouter } from '@/test/render'

function renderBoard(isOwner: boolean) {
  return renderWithRouter(<TodayBoard isOwner={isOwner} />)
}

describe('TodayBoard', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'listOrders').mockImplementation((query) =>
      Promise.resolve(
        query.status === 'reserved'
          ? {
              items: [
                orderSummary({ id: 1, status: 'reserved' }),
                orderSummary({ id: 2, status: 'reserved' }),
              ],
              total: 2,
            }
          : { items: [], total: 0 },
      ),
    )
    vi.spyOn(api, 'listProducts').mockResolvedValue([
      product({ id: 1, name: 'เสื้อยืด', on_hand: 20, stock_status: 'in_stock' }),
      product({ id: 2, name: 'แก้วน้ำ', on_hand: 0, stock_status: 'out_of_stock' }),
      product({ id: 3, name: 'หมวก', on_hand: 2, stock_status: 'low' }),
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

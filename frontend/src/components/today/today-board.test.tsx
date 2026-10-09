import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TodayBoard } from '@/components/today/today-board'
import { api } from '@/lib/api'
import { movement, orderSummary, product } from '@/test/fixtures'
import { renderWithRouter } from '@/test/render'

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()

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
                orderSummary({ id: 1, status: 'reserved', created_at: hoursAgo(3) }),
                orderSummary({ id: 2, status: 'reserved', created_at: hoursAgo(72) }),
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
    vi.spyOn(api, 'getTodaySales').mockResolvedValue({
      date: '2026-10-05',
      orders: 4,
      revenue: '1250.00',
      shipped: 2,
      channels: [
        { channel: 'store', orders: 1, revenue: '200.00' },
        { channel: 'shopee', orders: 0, revenue: '0.00' },
        { channel: 'line', orders: 3, revenue: '1050.00' },
      ],
    })
    vi.spyOn(api, 'listMovements').mockResolvedValue({
      items: [movement({ id: 9, product_name: 'กระเป๋าผ้า', type: 'STOCK_IN', qty_change: 12 })],
      total: 1,
    })
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
    expect(screen.queryByRole('region', { name: 'ผลนับรอยืนยัน' })).not.toBeInTheDocument()
  })

  it('shows how long each order has waited', async () => {
    vi.spyOn(api, 'listCounts').mockResolvedValue({ items: [], total: 0 })
    renderBoard(true)

    expect(await screen.findByText('รอ 3 ชม.')).toBeInTheDocument()
    expect(screen.getByText('รอ 3 วัน')).toBeInTheDocument()
  })

  it('shows the latest stock movements', async () => {
    renderBoard(false)

    const recent = await screen.findByRole('region', { name: 'ความเคลื่อนไหวล่าสุด' })
    expect(await within(recent).findByText('กระเป๋าผ้า')).toBeInTheDocument()
    expect(within(recent).getByText('+12')).toBeInTheDocument()
  })

  it('asks the owner to review submitted counts', async () => {
    vi.spyOn(api, 'listCounts').mockResolvedValue({ items: [], total: 2 })
    renderBoard(true)

    const notice = await screen.findByRole('region', { name: 'ผลนับรอยืนยัน' })
    expect(within(notice).getByLabelText('ผลนับรอยืนยัน 2')).toBeInTheDocument()
    expect(within(notice).getByRole('link', { name: 'ตรวจผลนับ' })).toBeInTheDocument()
  })

  it('asks for the longest-waiting orders first', async () => {
    renderBoard(false)

    expect(await screen.findByText('ORD-2026-00001')).toBeInTheDocument()
    expect(api.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'reserved', sort: 'oldest' }),
      expect.anything(),
    )
    expect(api.listOrders).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'packed', sort: 'oldest' }),
      expect.anything(),
    )
  })

  it('shows the owner what sold today', async () => {
    vi.spyOn(api, 'listCounts').mockResolvedValue({ items: [], total: 0 })
    renderBoard(true)

    const strip = await screen.findByRole('region', { name: 'ขายวันนี้' })
    expect(await within(strip).findByText('฿1,250')).toBeInTheDocument()
    expect(within(strip).getByText('จาก 4 ออเดอร์ ไม่นับที่ยกเลิก')).toBeInTheDocument()
    expect(within(strip).getByText('฿1,050')).toBeInTheDocument()
    expect(within(strip).getByText('2 ออเดอร์')).toBeInTheDocument()
  })

  it('keeps sales away from staff', async () => {
    renderBoard(false)

    expect(await screen.findByText('ORD-2026-00001')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'ขายวันนี้' })).not.toBeInTheDocument()
    expect(api.getTodaySales).not.toHaveBeenCalled()
  })

  it('hides count approvals from staff', async () => {
    const counts = vi.spyOn(api, 'listCounts')
    renderBoard(false)

    expect(await screen.findByText('ORD-2026-00001')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'ผลนับรอยืนยัน' })).not.toBeInTheDocument()
    expect(counts).not.toHaveBeenCalled()
  })
})

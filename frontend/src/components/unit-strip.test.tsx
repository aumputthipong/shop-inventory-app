import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StockBar, UnitStrip } from '@/components/unit-strip'

describe('UnitStrip', () => {
  it('draws one cell per unit and names both groups', () => {
    const { container } = render(<UnitStrip available={3} held={5} />)

    expect(
      screen.getByRole('img', { name: 'ขายได้ 3 ชิ้น รอดำเนินการ 5 ชิ้น' }),
    ).toBeInTheDocument()
    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(8)
  })

  it('switches to a proportional bar when there are too many units to draw', () => {
    const { container } = render(<UnitStrip available={58} held={2} />)

    expect(container.querySelectorAll('[role="img"] > span')).toHaveLength(2)
  })

  it('says so when nothing is in stock', () => {
    render(<UnitStrip available={0} held={0} />)

    expect(screen.getByRole('img', { name: 'ไม่มีของในคลัง' })).toBeInTheDocument()
  })
})

describe('StockBar', () => {
  it.each([
    { onHand: 22, held: 6, caption: 'จองไว้ 6 จาก 22' },
    { onHand: 6, held: 6, caption: 'จองไว้ครบทั้ง 6' },
    { onHand: 1, held: 0, caption: 'มีในคลัง 1 ยังไม่มีออเดอร์จอง' },
    { onHand: 0, held: 0, caption: 'ไม่มีของในคลัง' },
  ])('says $caption', ({ onHand, held, caption }) => {
    render(<StockBar onHand={onHand} held={held} />)

    expect(screen.getByText(caption)).toBeInTheDocument()
    expect(
      screen.getByRole('img', {
        name: `ขายได้ ${onHand - held} ชิ้น จองไว้ ${held} ชิ้น จากที่มี ${onHand} ชิ้น`,
      }),
    ).toBeInTheDocument()
  })
})

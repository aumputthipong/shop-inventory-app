import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { UnitStrip } from '@/components/unit-strip'

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

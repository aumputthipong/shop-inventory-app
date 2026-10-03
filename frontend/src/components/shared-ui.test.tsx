import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ErrorAlert } from '@/components/error-alert'
import { PageHeader } from '@/components/page-header'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { renderWithRouter } from '@/test/render'

describe('ErrorAlert', () => {
  it('is announced as an alert', () => {
    render(<ErrorAlert>บันทึกไม่สำเร็จ</ErrorAlert>)
    expect(screen.getByRole('alert')).toHaveTextContent('บันทึกไม่สำเร็จ')
  })
})

describe('Field', () => {
  it('labels its control and shows the error instead of the hint', () => {
    const { rerender } = render(
      <Field label="ราคา" hint="ทศนิยมได้ 2 ตำแหน่ง">
        <Input />
      </Field>,
    )
    expect(screen.getByRole('textbox', { name: 'ราคา' })).toBeInTheDocument()
    expect(screen.getByText('ทศนิยมได้ 2 ตำแหน่ง')).toBeInTheDocument()

    rerender(
      <Field label="ราคา" hint="ทศนิยมได้ 2 ตำแหน่ง" error="ใส่ราคาเป็นตัวเลข">
        <Input />
      </Field>,
    )
    expect(screen.getByText('ใส่ราคาเป็นตัวเลข')).toBeInTheDocument()
    expect(screen.queryByText('ทศนิยมได้ 2 ตำแหน่ง')).not.toBeInTheDocument()
  })
})

describe('PageHeader', () => {
  it('shows the back link, title, description and actions', async () => {
    renderWithRouter(
      <PageHeader
        back={{ to: '/orders', label: 'กลับไปหน้าออเดอร์' }}
        title="ขายหน้าร้าน"
        description="เลือกสินค้าแล้วบันทึก"
        actions={<button type="button">บันทึก</button>}
      />,
    )

    expect(await screen.findByRole('heading', { name: 'ขายหน้าร้าน' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'กลับไปหน้าออเดอร์' })).toHaveAttribute(
      'href',
      '/orders',
    )
    expect(screen.getByText('เลือกสินค้าแล้วบันทึก')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeInTheDocument()
  })
})

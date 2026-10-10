import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppNav } from '@/components/app-nav'
import { renderWithRouter } from '@/test/render'

describe('AppNav', () => {
  it('shows shop management to the owner only', async () => {
    const { unmount } = renderWithRouter(<AppNav isOwner />)
    expect(await screen.findByRole('link', { name: 'ทีม' })).toBeInTheDocument()
    unmount()

    renderWithRouter(<AppNav isOwner={false} />)
    expect(await screen.findByRole('link', { name: 'สต็อก' })).toBeInTheDocument()
    expect(screen.queryByText('จัดการร้าน')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'ทีม' })).not.toBeInTheDocument()
  })

  it('marks the current page', async () => {
    renderWithRouter(<AppNav isOwner={false} />)

    expect(await screen.findByRole('link', { name: 'วันนี้' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'ออเดอร์' })).not.toHaveAttribute('aria-current')
  })

  it('tells the drawer to close when a link is followed', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    renderWithRouter(<AppNav isOwner={false} onNavigate={onNavigate} />)

    await user.click(await screen.findByRole('link', { name: 'สต็อก' }))

    expect(onNavigate).toHaveBeenCalled()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DemoAccounts } from '@/components/auth/demo-accounts'
import { api } from '@/lib/api'

function renderBox(onPick = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <DemoAccounts onPick={onPick} />
    </QueryClientProvider>,
  )
  return onPick
}

describe('DemoAccounts', () => {
  it('lists the demo sign-ins and fills the form on request', async () => {
    vi.spyOn(api, 'demoAccounts').mockResolvedValue([
      { role: 'owner', email: 'owner@demo.shop', password: 'demo-owner-2026' },
      { role: 'staff', email: 'staff@demo.shop', password: 'demo-staff-2026' },
    ])
    const user = userEvent.setup()
    const onPick = renderBox()

    expect(await screen.findByText('owner@demo.shop')).toBeInTheDocument()
    expect(screen.getByText('demo-staff-2026')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'ใช้บัญชีพนักงาน' }))

    expect(onPick).toHaveBeenCalledWith({
      role: 'staff',
      email: 'staff@demo.shop',
      password: 'demo-staff-2026',
    })
  })

  it('shows nothing on a real shop', async () => {
    const demo = vi.spyOn(api, 'demoAccounts').mockResolvedValue([])
    renderBox()

    await vi.waitFor(() => {
      expect(demo).toHaveBeenCalled()
    })
    expect(screen.queryByRole('region', { name: 'บัญชีทดลอง' })).not.toBeInTheDocument()
  })
})

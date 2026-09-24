import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HealthStatus } from '@/components/health-status'
import { ApiError, api } from '@/lib/api'

function renderWithClient() {
  // A fresh client per test: no shared cache, and no retries to wait out.
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <HealthStatus />
    </QueryClientProvider>,
  )
}

describe('HealthStatus', () => {
  it('shows operational when the api and database are healthy', async () => {
    vi.spyOn(api, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })

    renderWithClient()

    expect(await screen.findByText('Operational')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('reachable')).toBeInTheDocument()
  })

  it('shows degraded when the database is unreachable', async () => {
    vi.spyOn(api, 'getHealth').mockResolvedValue({ status: 'degraded', db: 'error' })

    renderWithClient()

    expect(await screen.findByText('Degraded')).toBeInTheDocument()
    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('shows the api as unreachable when the request fails', async () => {
    vi.spyOn(api, 'getHealth').mockRejectedValue(new ApiError(502, undefined))

    renderWithClient()

    expect(await screen.findByText('API unreachable')).toBeInTheDocument()
    expect(screen.getByText('HTTP 502')).toBeInTheDocument()
  })

  it('checks again when refresh is clicked', async () => {
    const getHealth = vi.spyOn(api, 'getHealth').mockResolvedValue({ status: 'ok', db: 'ok' })
    const user = userEvent.setup()

    renderWithClient()
    await screen.findByText('Operational')

    await user.click(screen.getByRole('button', { name: /refresh/i }))

    await vi.waitFor(() => {
      expect(getHealth).toHaveBeenCalledTimes(2)
    })
  })
})

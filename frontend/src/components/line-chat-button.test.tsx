import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LineChatButton } from '@/components/line-chat-button'
import { api } from '@/lib/api'
import { useLineChatUrl } from '@/lib/use-line-chat-url'
import { renderWithQuery } from '@/test/render'

function ChatIfSet() {
  const url = useLineChatUrl()
  return url ? <LineChatButton url={url} /> : <p>no chat</p>
}

describe('LineChatButton', () => {
  it('links to the official account in a new tab', async () => {
    vi.spyOn(api, 'lineSettings').mockResolvedValue({
      mode: 'live',
      liff_id: 'x',
      oa_url: 'https://line.me/R/ti/p/@shop',
    })
    renderWithQuery(<ChatIfSet />)

    const link = await screen.findByRole('link', { name: 'แชทกับร้านทาง LINE' })
    expect(link).toHaveAttribute('href', 'https://line.me/R/ti/p/@shop')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('stays hidden when the shop has no official account set', async () => {
    const settings = vi
      .spyOn(api, 'lineSettings')
      .mockResolvedValue({ mode: 'off', liff_id: '', oa_url: '' })
    renderWithQuery(<ChatIfSet />)

    await vi.waitFor(() => {
      expect(settings).toHaveBeenCalled()
    })
    expect(screen.getByText('no chat')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

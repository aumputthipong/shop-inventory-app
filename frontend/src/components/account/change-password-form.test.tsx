import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChangePasswordForm } from '@/components/account/change-password-form'
import { ApiError, api } from '@/lib/api'
import { renderWithQuery } from '@/test/render'

function renderForm() {
  return renderWithQuery(<ChangePasswordForm />)
}

async function fill(current: string, next: string, confirm: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), current)
  await user.type(screen.getByLabelText('รหัสผ่านใหม่'), next)
  await user.type(screen.getByLabelText('พิมพ์รหัสผ่านใหม่อีกครั้ง'), confirm)
  return user
}

describe('ChangePasswordForm', () => {
  it('waits until both new passwords match', async () => {
    renderForm()

    await fill('owner-pass-123', 'brand-new-pass', 'brand-new-pas')

    expect(screen.getByText('รหัสผ่านสองช่องไม่ตรงกัน')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' })).toBeDisabled()
  })

  it('says so when the current password is wrong', async () => {
    vi.spyOn(api, 'changePassword').mockRejectedValue(
      new ApiError(422, {
        error: {
          code: 'validation_failed',
          message: 'request validation failed',
          fields: [{ field: 'current_password', message: 'is not your current password' }],
        },
      }),
    )
    renderForm()

    const user = await fill('guess-123', 'brand-new-pass', 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('รหัสผ่านปัจจุบันไม่ถูกต้อง')
  })

  it('sends both passwords and clears the form once saved', async () => {
    const change = vi.spyOn(api, 'changePassword').mockResolvedValue(undefined)
    renderForm()

    const user = await fill('owner-pass-123', 'brand-new-pass', 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่านใหม่' }))

    expect(change).toHaveBeenCalledWith({
      current_password: 'owner-pass-123',
      new_password: 'brand-new-pass',
    })
    await vi.waitFor(() => {
      expect(screen.getByLabelText('รหัสผ่านปัจจุบัน')).toHaveValue('')
    })
  })
})

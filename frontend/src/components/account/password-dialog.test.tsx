import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { PasswordDialog } from '@/components/account/password-dialog'
import { ApiError } from '@/lib/api'

function renderDialog(submit: (current: string, next: string) => Promise<unknown>) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PasswordDialog
        open
        onOpenChange={() => undefined}
        title="เปลี่ยนรหัสผ่าน"
        description="เครื่องอื่นจะถูกออกจากระบบ"
        askCurrent
        submit={submit}
        doneMessage="เปลี่ยนรหัสผ่านแล้ว"
      />
    </QueryClientProvider>,
  )
}

describe('PasswordDialog', () => {
  it('waits until both new passwords match', async () => {
    const user = userEvent.setup()
    renderDialog(vi.fn())

    await user.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), 'owner-pass-123')
    await user.type(screen.getByLabelText('รหัสผ่านใหม่'), 'brand-new-pass')
    await user.type(screen.getByLabelText('พิมพ์รหัสผ่านใหม่อีกครั้ง'), 'brand-new-pas')

    expect(screen.getByText('รหัสผ่านสองช่องไม่ตรงกัน')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'บันทึกรหัสผ่าน' })).toBeDisabled()
  })

  it('says so when the current password is wrong', async () => {
    const submit = vi.fn().mockRejectedValue(
      new ApiError(422, {
        error: {
          code: 'validation_failed',
          message: 'request validation failed',
          fields: [{ field: 'current_password', message: 'is not your current password' }],
        },
      }),
    )
    const user = userEvent.setup()
    renderDialog(submit)

    await user.type(screen.getByLabelText('รหัสผ่านปัจจุบัน'), 'guess-123')
    await user.type(screen.getByLabelText('รหัสผ่านใหม่'), 'brand-new-pass')
    await user.type(screen.getByLabelText('พิมพ์รหัสผ่านใหม่อีกครั้ง'), 'brand-new-pass')
    await user.click(screen.getByRole('button', { name: 'บันทึกรหัสผ่าน' }))

    expect(submit).toHaveBeenCalledWith('guess-123', 'brand-new-pass')
    expect(await screen.findByRole('alert')).toHaveTextContent('รหัสผ่านปัจจุบันไม่ถูกต้อง')
  })
})

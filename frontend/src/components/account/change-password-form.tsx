import { useMutation } from '@tanstack/react-query'
import { useState, type SubmitEvent } from 'react'

import { NewPasswordFields } from '@/components/account/new-password-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, api } from '@/lib/api'
import { checkNewPassword } from '@/lib/password'
import { useToast } from '@/lib/toast'

export function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const toast = useToast()

  const save = useMutation({
    mutationFn: () => api.changePassword({ current_password: current, new_password: next }),
    onSuccess: () => {
      toast('เปลี่ยนรหัสผ่านแล้ว เครื่องอื่นที่ล็อกอินอยู่ถูกออกจากระบบแล้ว')
      setCurrent('')
      setNext('')
      setConfirm('')
    },
  })

  const valid = current !== '' && checkNewPassword(next, confirm).ok
  const wrongCurrent =
    save.error instanceof ApiError && save.error.fields.some((f) => f.field === 'current_password')

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">รหัสผ่านปัจจุบัน</span>
        <Input
          type="password"
          autoComplete="current-password"
          value={current}
          aria-invalid={wrongCurrent ? true : undefined}
          onChange={(e) => {
            setCurrent(e.target.value)
          }}
        />
      </label>
      <NewPasswordFields next={next} confirm={confirm} onNext={setNext} onConfirm={setConfirm} />
      {save.isError && (
        <p role="alert" className="rounded-2xl bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
          {wrongCurrent ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง' : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'}
        </p>
      )}
      <div>
        <Button type="submit" size="lg" disabled={!valid || save.isPending}>
          บันทึกรหัสผ่านใหม่
        </Button>
      </div>
    </form>
  )
}

import { useId } from 'react'

import { Input } from '@/components/ui/input'
import { MIN_PASSWORD_LENGTH, checkNewPassword } from '@/lib/password'

export function NewPasswordFields({
  next,
  confirm,
  onNext,
  onConfirm,
}: {
  next: string
  confirm: string
  onNext: (value: string) => void
  onConfirm: (value: string) => void
}) {
  const id = useId()
  const { tooShort, mismatch } = checkNewPassword(next, confirm)
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-next`} className="text-[13px] font-medium text-ink-2">
          รหัสผ่านใหม่
        </label>
        <Input
          id={`${id}-next`}
          type="password"
          autoComplete="new-password"
          value={next}
          aria-invalid={tooShort ? true : undefined}
          aria-describedby={`${id}-rule`}
          onChange={(e) => {
            onNext(e.target.value)
          }}
        />
        <span
          id={`${id}-rule`}
          className={tooShort ? 'text-sm text-destructive' : 'text-sm text-ink-2'}
        >
          อย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-confirm`} className="text-[13px] font-medium text-ink-2">
          พิมพ์รหัสผ่านใหม่อีกครั้ง
        </label>
        <Input
          id={`${id}-confirm`}
          type="password"
          autoComplete="new-password"
          value={confirm}
          aria-invalid={mismatch ? true : undefined}
          onChange={(e) => {
            onConfirm(e.target.value)
          }}
        />
        {mismatch && <span className="text-sm text-destructive">รหัสผ่านสองช่องไม่ตรงกัน</span>}
      </div>
    </>
  )
}

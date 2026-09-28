import { useMutation } from '@tanstack/react-query'
import { KeyRoundIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ApiError } from '@/lib/api'
import { useToast } from '@/lib/toast'

const MIN = 8

// Used for both "change my password" (asks for the current one) and an owner resetting a member's.
export function PasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  askCurrent,
  submit,
  doneMessage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  askCurrent: boolean
  submit: (current: string, next: string) => Promise<unknown>
  doneMessage: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {open && (
          <PasswordForm
            title={title}
            description={description}
            askCurrent={askCurrent}
            submit={submit}
            doneMessage={doneMessage}
            onDone={() => {
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PasswordForm({
  title,
  description,
  askCurrent,
  submit,
  doneMessage,
  onDone,
}: {
  title: string
  description: string
  askCurrent: boolean
  submit: (current: string, next: string) => Promise<unknown>
  doneMessage: string
  onDone: () => void
}) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const toast = useToast()

  const save = useMutation({
    mutationFn: () => submit(current, next),
    onSuccess: () => {
      toast(doneMessage)
      onDone()
    },
  })

  const tooShort = next.length > 0 && next.length < MIN
  const mismatch = confirm.length > 0 && confirm !== next
  const valid = (!askCurrent || current !== '') && next.length >= MIN && confirm === next

  const serverError =
    save.error instanceof ApiError && save.error.fields.some((f) => f.field === 'current_password')
      ? 'รหัสผ่านปัจจุบันไม่ถูกต้อง'
      : save.error
        ? 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
        : null

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="contents" noValidate>
      <DialogHeader
        icon={<KeyRoundIcon className="size-6" />}
        title={title}
        description={description}
      />
      {askCurrent && (
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">รหัสผ่านปัจจุบัน</span>
          <Input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => {
              setCurrent(e.target.value)
            }}
          />
        </label>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">รหัสผ่านใหม่</span>
        <Input
          type="password"
          autoComplete="new-password"
          value={next}
          aria-invalid={tooShort ? true : undefined}
          onChange={(e) => {
            setNext(e.target.value)
          }}
        />
        {tooShort && <span className="text-sm text-destructive">อย่างน้อย {MIN} ตัวอักษร</span>}
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">พิมพ์รหัสผ่านใหม่อีกครั้ง</span>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          aria-invalid={mismatch ? true : undefined}
          onChange={(e) => {
            setConfirm(e.target.value)
          }}
        />
        {mismatch && <span className="text-sm text-destructive">รหัสผ่านสองช่องไม่ตรงกัน</span>}
      </label>
      {serverError && (
        <p role="alert" className="rounded-2xl bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
          {serverError}
        </p>
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" size="lg">
            ยกเลิก
          </Button>
        </DialogClose>
        <Button type="submit" size="lg" disabled={!valid || save.isPending}>
          บันทึกรหัสผ่าน
        </Button>
      </DialogFooter>
    </form>
  )
}

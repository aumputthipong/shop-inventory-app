import { useMutation } from '@tanstack/react-query'
import { KeyRoundIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { NewPasswordFields } from '@/components/account/new-password-fields'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { api, type TeamMember } from '@/lib/api'
import { checkNewPassword } from '@/lib/password'
import { useToast } from '@/lib/toast'

export function ResetPasswordDialog({
  member,
  onClose,
}: {
  member: TeamMember | null
  onClose: () => void
}) {
  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>{member && <ResetForm member={member} onDone={onClose} />}</DialogContent>
    </Dialog>
  )
}

function ResetForm({ member, onDone }: { member: TeamMember; onDone: () => void }) {
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const toast = useToast()

  const save = useMutation({
    mutationFn: () => api.resetUserPassword(member.id, next),
    onSuccess: () => {
      toast(`ตั้งรหัสผ่านใหม่ให้ ${member.name} แล้ว`)
      onDone()
    },
  })
  const valid = checkNewPassword(next, confirm).ok

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="contents" noValidate>
      <DialogHeader
        icon={<KeyRoundIcon className="size-6" />}
        title={`ตั้งรหัสผ่านใหม่ให้ ${member.name}`}
        description="บอกรหัสใหม่ให้เจ้าตัว เครื่องที่ล็อกอินอยู่จะถูกออกจากระบบ"
      />
      <NewPasswordFields next={next} confirm={confirm} onNext={setNext} onConfirm={setConfirm} />
      {save.isError && (
        <p role="alert" className="rounded-2xl bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
          บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง
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

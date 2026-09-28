import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { UserPlusIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { Chip } from '@/components/chip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog'
import { Input, NativeSelect } from '@/components/ui/input'
import { ApiError, api, type Role } from '@/lib/api'
import { productInitial } from '@/lib/avatar'
import { formatFullDateTime } from '@/lib/format'
import { requireOwner } from '@/lib/guards'
import { roleLabel } from '@/lib/labels'
import { usersQueryOptions } from '@/lib/queries'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/_app/team')({
  beforeLoad: ({ context }) => {
    requireOwner(context.me)
  },
  component: TeamPage,
})

function TeamPage() {
  const { data: users, isPending } = useQuery(usersQueryOptions)
  const [adding, setAdding] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[30px] leading-[42px] font-bold">ทีม</h1>
          <p className="text-base text-sand-800">
            พนักงานรับของเข้า ขาย แพ็ก และส่งได้ ส่วนการปรับยอด แก้สินค้า
            และดูบันทึกการใช้งานเป็นของเจ้าของร้าน
          </p>
        </div>
        <Button
          onClick={() => {
            setAdding(true)
          }}
        >
          <UserPlusIcon aria-hidden="true" />
          เพิ่มสมาชิก
        </Button>
      </div>

      <section
        aria-label="สมาชิกในทีม"
        className="max-w-[900px] rounded-[22px] bg-white p-3 shadow-soft"
      >
        {isPending && <p className="px-4 py-8 text-sand-800">กำลังโหลด...</p>}
        <ul className="flex flex-col">
          {users?.map((u) => (
            <li
              key={u.id}
              className="grid min-h-16 grid-cols-[44px_minmax(0,1fr)_140px_180px] items-center gap-4 border-b border-sand-200 px-4 py-3 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full bg-hold-light text-lg font-bold text-[#7a4b00]"
              >
                {productInitial(u.name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold">{u.name}</span>
                <span className="truncate text-[13px] text-sand-800">{u.email}</span>
              </span>
              <span>
                <Chip tone={u.role === 'owner' ? 'info' : 'neutral'}>{roleLabel[u.role]}</Chip>
              </span>
              <span className="text-right text-[13px] text-sand-800">
                เข้าร่วม {formatFullDateTime(u.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          {adding && (
            <AddMemberForm
              onDone={() => {
                setAdding(false)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AddMemberForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('staff')
  const [password, setPassword] = useState('')
  const queryClient = useQueryClient()
  const toast = useToast()

  const save = useMutation({
    mutationFn: () => api.createUser({ name: name.trim(), email: email.trim(), role, password }),
    onSuccess: async (user) => {
      toast(`เพิ่ม ${user.name} เข้าทีมแล้ว`)
      onDone()
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey })
    },
  })

  const serverError =
    save.error instanceof ApiError
      ? save.error.code === 'conflict'
        ? 'อีเมลนี้มีบัญชีอยู่แล้ว'
        : save.error.fields.some((f) => f.field === 'email')
          ? 'อีเมลไม่ถูกต้อง'
          : 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง'
      : null

  const passwordShort = password.length > 0 && password.length < 8
  const valid = name.trim() !== '' && email.includes('@') && password.length >= 8

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="contents" noValidate>
      <DialogHeader
        icon={<UserPlusIcon className="size-6" />}
        title="เพิ่มสมาชิก"
        description="แจ้งอีเมลกับรหัสผ่านให้สมาชิกใหม่ใช้เข้าสู่ระบบ"
      />
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">ชื่อ</span>
        <Input
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value)
          }}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">อีเมล</span>
        <Input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
          }}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">บทบาท</span>
          <NativeSelect
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role)
            }}
          >
            <option value="staff">{roleLabel.staff}</option>
            <option value="owner">{roleLabel.owner}</option>
          </NativeSelect>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[15px] font-semibold">รหัสผ่าน</span>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={passwordShort || undefined}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
          />
          {passwordShort && <span className="text-sm text-destructive">อย่างน้อย 8 ตัวอักษร</span>}
        </label>
      </div>
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
          เพิ่มสมาชิก
        </Button>
      </DialogFooter>
    </form>
  )
}

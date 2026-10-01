import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { cn } from 'cn'
import { KeyRoundIcon, UserCheckIcon, UserPlusIcon, UserXIcon } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'

import { ResetPasswordDialog } from '@/components/account/reset-password-dialog'
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
import { ApiError, api, type Role, type TeamMember } from '@/lib/api'
import { productInitial } from '@/lib/avatar'
import { formatFullDateTime } from '@/lib/format'
import { requireOwner } from '@/lib/guards'
import { roleLabel } from '@/lib/labels'
import { usersQueryOptions } from '@/lib/queries'
import { useCurrentUser } from '@/lib/session'
import { useToast } from '@/lib/toast'

export const Route = createFileRoute('/_app/team')({
  beforeLoad: ({ context }) => {
    requireOwner(context.me)
  },
  component: TeamPage,
})

function TeamPage() {
  const { data: users, isPending } = useQuery(usersQueryOptions)
  const me = useCurrentUser()
  const queryClient = useQueryClient()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<TeamMember | null>(null)
  const [disabling, setDisabling] = useState<TeamMember | null>(null)

  const setActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => api.setUserActive(id, active),
    onSuccess: async (user) => {
      toast(
        user.is_active
          ? `เปิดใช้งานบัญชี ${user.name} แล้ว`
          : `ปิดใช้งานบัญชี ${user.name} แล้ว ออกจากระบบทุกเครื่องให้แล้ว`,
      )
      setDisabling(null)
      await queryClient.invalidateQueries({ queryKey: usersQueryOptions.queryKey })
    },
  })
  const lastOwner =
    setActive.error instanceof ApiError &&
    (setActive.error.details as { reason?: string } | undefined)?.reason === 'last_owner'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[22px] leading-[30px] font-semibold">ทีม</h1>
          <p className="text-sm text-ink-2">
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

      <section aria-label="สมาชิกในทีม" className="max-w-[1000px] overflow-x-auto panel p-3">
        {isPending && <p className="px-4 py-8 text-ink-2">กำลังโหลด...</p>}
        <ul className="flex min-w-[760px] flex-col">
          {users?.map((u) => (
            <li
              key={u.id}
              className={cn(
                'grid min-h-16 grid-cols-[44px_minmax(0,1fr)_120px_auto] items-center gap-4 border-b border-line px-4 py-3 last:border-b-0',
                !u.is_active && 'opacity-60',
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-full bg-kraft-100 text-base font-semibold text-kraft-700"
              >
                {productInitial(u.name)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2 font-semibold">
                  {u.name}
                  {!u.is_active && <Chip tone="neutral">ปิดใช้งาน</Chip>}
                </span>
                <span className="truncate text-[13px] text-ink-2">
                  {u.email} · เข้าร่วม {formatFullDateTime(u.created_at)}
                </span>
              </span>
              <span>
                <Chip tone={u.role === 'owner' ? 'info' : 'neutral'}>{roleLabel[u.role]}</Chip>
              </span>
              <span className="flex justify-end gap-2">
                {u.id === me.id ? (
                  <span className="text-sm text-ink-2">บัญชีของคุณ</span>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setResetting(u)
                      }}
                    >
                      <KeyRoundIcon aria-hidden="true" />
                      ตั้งรหัสผ่านใหม่
                    </Button>
                    {u.is_active ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setActive.reset()
                          setDisabling(u)
                        }}
                      >
                        <UserXIcon aria-hidden="true" />
                        ปิดใช้งาน
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setActive.isPending}
                        onClick={() => {
                          setActive.mutate({ id: u.id, active: true })
                        }}
                      >
                        <UserCheckIcon aria-hidden="true" />
                        เปิดใช้งาน
                      </Button>
                    )}
                  </>
                )}
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

      <ResetPasswordDialog
        member={resetting}
        onClose={() => {
          setResetting(null)
        }}
      />

      <Dialog
        open={disabling !== null}
        onOpenChange={(open) => {
          if (!open) setDisabling(null)
        }}
      >
        <DialogContent>
          <DialogHeader
            icon={<UserXIcon className="size-6" />}
            title={`ปิดใช้งาน ${disabling?.name ?? ''}?`}
            description="เจ้าตัวจะถูกออกจากระบบทันทีและล็อกอินไม่ได้ ประวัติที่เคยทำยังอยู่ครบ เปิดกลับได้ภายหลัง"
          />
          {lastOwner && (
            <p role="alert" className="rounded-lg bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
              ปิดไม่ได้ ร้านต้องมีเจ้าของร้านที่ใช้งานได้อย่างน้อย 1 คน
            </p>
          )}
          {setActive.isError && !lastOwner && (
            <p role="alert" className="rounded-lg bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
              บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg">
                ไม่ปิด
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              size="lg"
              disabled={setActive.isPending || lastOwner}
              onClick={() => {
                if (disabling) setActive.mutate({ id: disabling.id, active: false })
              }}
            >
              ปิดใช้งานบัญชี
            </Button>
          </DialogFooter>
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
        <span className="text-[13px] font-medium text-ink-2">ชื่อ</span>
        <Input
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value)
          }}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-ink-2">อีเมล</span>
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
          <span className="text-[13px] font-medium text-ink-2">บทบาท</span>
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
          <span className="text-[13px] font-medium text-ink-2">รหัสผ่าน</span>
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
        <p role="alert" className="rounded-lg bg-chip-bad px-3.5 py-3 text-sm text-chip-bad-fg">
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

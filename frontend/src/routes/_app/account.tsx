import { createFileRoute } from '@tanstack/react-router'
import { KeyRoundIcon, UserRoundIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChangePasswordForm } from '@/components/account/change-password-form'
import { Chip } from '@/components/chip'
import { productInitial } from '@/lib/avatar'
import { roleLabel } from '@/lib/labels'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app/account')({
  component: AccountPage,
})

function AccountPage() {
  const me = useCurrentUser()

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div>
        <h1 className="text-[30px] leading-[42px] font-bold">บัญชีของฉัน</h1>
        <p className="text-base text-sand-800">ข้อมูลที่ใช้เข้าสู่ระบบ และรหัสผ่านของคุณ</p>
      </div>

      <Card icon={<UserRoundIcon className="size-5" />} title="ข้อมูลบัญชี">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-hold-light text-2xl font-bold text-[#7a4b00]"
          >
            {productInitial(me.name)}
          </span>
          <dl className="grid flex-1 grid-cols-[100px_minmax(0,1fr)] gap-x-4 gap-y-1.5">
            <dt className="text-sand-800">ชื่อ</dt>
            <dd className="font-semibold">{me.name}</dd>
            <dt className="text-sand-800">อีเมล</dt>
            <dd className="truncate">{me.email}</dd>
            <dt className="text-sand-800">บทบาท</dt>
            <dd>
              <Chip tone={me.isOwner ? 'info' : 'neutral'}>{roleLabel[me.role]}</Chip>
            </dd>
          </dl>
        </div>
      </Card>

      <Card
        icon={<KeyRoundIcon className="size-5" />}
        title="เปลี่ยนรหัสผ่าน"
        description="หลังบันทึก เครื่องอื่นที่ล็อกอินบัญชีนี้อยู่จะถูกออกจากระบบ เครื่องนี้ยังใช้งานต่อได้"
      >
        <ChangePasswordForm />
      </Card>
    </div>
  )
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section aria-label={title} className="rounded-[22px] bg-white p-6 shadow-soft">
      <div className="mb-5 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-petrol-100 text-petrol-600"
        >
          {icon}
        </span>
        <div>
          <h2 className="text-lg leading-10 font-bold">{title}</h2>
          {description && <p className="text-sm text-sand-800">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { KeyRoundIcon, UserRoundIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { ChangePasswordForm } from '@/components/account/change-password-form'
import { Chip } from '@/components/chip'
import { PageHeader } from '@/components/page-header'
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
      <PageHeader title="บัญชีของฉัน" description="ข้อมูลที่ใช้เข้าสู่ระบบ และรหัสผ่านของคุณ" />

      <Card icon={<UserRoundIcon className="size-5" />} title="ข้อมูลบัญชี">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-marker-100 text-lg font-semibold text-marker-700"
          >
            {productInitial(me.name)}
          </span>
          <dl className="grid flex-1 grid-cols-[100px_minmax(0,1fr)] gap-x-4 gap-y-1.5">
            <dt className="text-ink-2">ชื่อ</dt>
            <dd className="font-medium">{me.name}</dd>
            <dt className="text-ink-2">อีเมล</dt>
            <dd className="truncate">{me.email}</dd>
            <dt className="text-ink-2">บทบาท</dt>
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
    <section aria-label={title} className="panel p-5">
      <div className="mb-4 flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-0.5 flex shrink-0 text-brand-600">
          {icon}
        </span>
        <div>
          <h2 className="text-base leading-6 font-semibold">{title}</h2>
          {description && <p className="text-[13px] text-ink-2">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

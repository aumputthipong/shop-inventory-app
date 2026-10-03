import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/page-header'
import { TodayBoard } from '@/components/today/today-board'
import { useCurrentUser } from '@/lib/session'

const longDate = new Intl.DateTimeFormat('th-TH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

export const Route = createFileRoute('/_app/')({
  component: TodayPage,
})

function TodayPage() {
  const me = useCurrentUser()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={longDate.format(new Date())}
        title={<>สวัสดี {me.name}</>}
        description="งานที่ต้องทำวันนี้ เริ่มจากออเดอร์ที่ค้างอยู่ก่อน"
      />
      <TodayBoard isOwner={me.isOwner} />
    </div>
  )
}

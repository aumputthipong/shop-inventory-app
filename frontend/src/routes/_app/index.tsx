import { createFileRoute } from '@tanstack/react-router'

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
      <div>
        <p className="text-[13px] text-ink-2">{longDate.format(new Date())}</p>
        <h1 className="text-[22px] leading-[30px] font-semibold">สวัสดี {me.name}</h1>
        <p className="text-sm text-ink-2">งานที่ต้องทำวันนี้ เริ่มจากออเดอร์ที่ค้างอยู่ก่อน</p>
      </div>
      <TodayBoard isOwner={me.isOwner} />
    </div>
  )
}

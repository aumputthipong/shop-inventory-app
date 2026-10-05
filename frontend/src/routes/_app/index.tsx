import { createFileRoute } from '@tanstack/react-router'

import { TodayBoard } from '@/components/today/today-board'
import { useCurrentUser } from '@/lib/session'

export const Route = createFileRoute('/_app/')({
  component: TodayPage,
})

function TodayPage() {
  const me = useCurrentUser()
  return <TodayBoard isOwner={me.isOwner} />
}

import { redirect } from '@tanstack/react-router'

import type { User } from '@/lib/api'

export function requireOwner(me: User) {
  if (me.role !== 'owner') {
    // eslint-disable-next-line @typescript-eslint/only-throw-error -- router control flow
    throw redirect({ to: '/stock' })
  }
}

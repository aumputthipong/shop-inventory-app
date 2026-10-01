import { useSuspenseQuery } from '@tanstack/react-query'

import { meQueryOptions } from '@/lib/queries'

export function useCurrentUser() {
  const { data } = useSuspenseQuery(meQueryOptions)
  return { ...data, isOwner: data.role === 'owner' }
}

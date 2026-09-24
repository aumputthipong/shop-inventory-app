import { queryOptions } from '@tanstack/react-query'

import { api } from '@/lib/api'

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: ({ signal }) => api.getHealth(signal),
  refetchInterval: 15_000,
})

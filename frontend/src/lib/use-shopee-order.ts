import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'

export function useShopeeOrder(externalRef: string) {
  const ref = externalRef.trim()
  return useQuery({
    queryKey: ['orders', 'shopee-ref', ref],
    queryFn: ({ signal }) => api.listOrders({ q: ref, limit: 50 }, signal),
    enabled: ref !== '',
    select: (page) =>
      page.items.find((o) => o.channel === 'shopee' && o.external_ref === ref) ?? null,
  })
}

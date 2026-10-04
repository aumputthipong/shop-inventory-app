import { keepPreviousData, queryOptions, type QueryClient } from '@tanstack/react-query'

import { api, type CountQuery, type MovementQuery, type OrderQuery } from '@/lib/api'

export const healthQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: ({ signal }) => api.getHealth(signal),
  refetchInterval: 15_000,
})

export const meQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: ({ signal }) => api.me(signal),
  staleTime: 5 * 60_000,
  retry: false,
})

export const lineSettingsQueryOptions = queryOptions({
  queryKey: ['line', 'settings'],
  queryFn: ({ signal }) => api.lineSettings(signal),
  staleTime: Infinity,
  retry: false,
})

export const productsQueryOptions = queryOptions({
  queryKey: ['products'],
  queryFn: ({ signal }) => api.listProducts(signal),
})

export const productQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['product', id],
    queryFn: ({ signal }) => api.getProduct(id, signal),
  })

export const movementsQueryOptions = (query: MovementQuery) =>
  queryOptions({
    queryKey: ['movements', query],
    queryFn: ({ signal }) => api.listMovements(query, signal),
    placeholderData: keepPreviousData,
  })

export const ordersQueryOptions = (query: OrderQuery) =>
  queryOptions({
    queryKey: ['orders', query],
    queryFn: ({ signal }) => api.listOrders(query, signal),
    placeholderData: keepPreviousData,
  })

export const orderQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['order', id],
    queryFn: ({ signal }) => api.getOrder(id, signal),
  })

export const countsQueryOptions = (query: CountQuery) =>
  queryOptions({
    queryKey: ['counts', query],
    queryFn: ({ signal }) => api.listCounts(query, signal),
    placeholderData: keepPreviousData,
  })

export const countQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ['count', id],
    queryFn: ({ signal }) => api.getCount(id, signal),
  })

export const auditQueryOptions = (query: { limit: number; offset: number }) =>
  queryOptions({
    queryKey: ['audit', query],
    queryFn: ({ signal }) => api.listAuditLogs(query, signal),
    placeholderData: keepPreviousData,
  })

export const usersQueryOptions = queryOptions({
  queryKey: ['users'],
  queryFn: ({ signal }) => api.listUsers(signal),
})

export function invalidateStock(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ['products'] }),
    client.invalidateQueries({ queryKey: ['product'] }),
    client.invalidateQueries({ queryKey: ['movements'] }),
    client.invalidateQueries({ queryKey: ['orders'] }),
    client.invalidateQueries({ queryKey: ['order'] }),
    client.invalidateQueries({ queryKey: ['counts'] }),
    client.invalidateQueries({ queryKey: ['count'] }),
  ])
}

import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { RouteError, RouteNotFound } from '@/components/route-states'
import { isApiError } from '@/lib/api'

import { routeTree } from './routeTree.gen'
import './index.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (
        isApiError(error) &&
        error.status === 401 &&
        router.state.location.pathname !== '/login' &&
        !router.state.location.pathname.startsWith('/line')
      ) {
        queryClient.clear()
        void router.navigate({ to: '/login', search: { redirect: router.state.location.href } })
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !(isApiError(error) && error.status < 500) && count < 1,
    },
  },
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  // Loaders read through the query cache, so the router need not cache too.
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultErrorComponent: RouteError,
  defaultNotFoundComponent: RouteNotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('index.html is missing the #root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

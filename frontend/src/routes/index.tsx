import { createFileRoute } from '@tanstack/react-router'

import { HealthStatus } from '@/components/health-status'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">System status</h1>
        <p className="text-sm text-muted-foreground">
          One stock pool shared across the store, Shopee and LINE OA.
        </p>
      </div>
      <div className="max-w-md">
        <HealthStatus />
      </div>
    </section>
  )
}

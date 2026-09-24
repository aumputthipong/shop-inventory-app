import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ApiError } from '@/lib/api'
import { healthQueryOptions } from '@/lib/queries'

type Tone = 'default' | 'secondary' | 'destructive' | 'outline'

interface Row {
  label: string
  value: string
  tone: Tone
}

export function HealthStatus() {
  const { data, error, isPending, isError, isFetching, refetch } = useQuery(healthQueryOptions)

  let summary: { label: string; tone: Tone }
  let rows: Row[]

  if (isPending) {
    summary = { label: 'Checking', tone: 'outline' }
    rows = []
  } else if (isError) {
    summary = { label: 'API unreachable', tone: 'destructive' }
    rows = [{ label: 'API', value: describeError(error), tone: 'destructive' }]
  } else {
    const healthy = data.status === 'ok'
    summary = healthy
      ? { label: 'Operational', tone: 'default' }
      : { label: 'Degraded', tone: 'destructive' }
    rows = [
      { label: 'API', value: 'reachable', tone: 'secondary' },
      { label: 'Database', value: data.db, tone: data.db === 'ok' ? 'secondary' : 'destructive' },
    ]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backend health</CardTitle>
        <CardDescription>Live result of GET /healthz, refreshed every 15 seconds.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'animate-spin' : undefined} aria-hidden="true" />
            Refresh
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div role="status" aria-live="polite" className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Status</span>
          <Badge variant={summary.tone}>{summary.label}</Badge>
        </div>
        {rows.length > 0 && (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd>
                  <Badge variant={row.tone}>{row.value}</Badge>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

function describeError(error: Error): string {
  if (error instanceof ApiError) {
    return `HTTP ${error.status}`
  }
  return 'no response'
}

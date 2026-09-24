// Typed fetch client for the Go api. Shapes mirror api/openapi.yaml; keep the
// two in step when either changes.

export type HealthStatus = 'ok' | 'degraded'
export type DependencyStatus = 'ok' | 'error'

export interface HealthResponse {
  status: HealthStatus
  db: DependencyStatus
}

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  error: {
    code: string
    message: string
    request_id?: string
    fields?: FieldError[]
  }
}

// Thrown for any response outside the caller's accepted statuses. code is the
// api's stable machine-readable code; branch on it, not on message.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | undefined
  readonly fields: FieldError[]

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    super(body?.error?.message ?? `request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code ?? 'http_error'
    this.requestId = body?.error?.request_id
    this.fields = body?.error?.fields ?? []
  }
}

interface RequestOptions extends RequestInit {
  // Non-2xx statuses whose body is still a valid T. /healthz answers 503 with
  // a normal health document, which is data rather than a failure.
  acceptStatuses?: readonly number[]
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { acceptStatuses = [], headers, ...init } = options

  const response = await fetch(path, {
    ...init,
    headers: { Accept: 'application/json', ...headers },
  })

  if (response.ok || acceptStatuses.includes(response.status)) {
    return (await response.json()) as T
  }

  throw new ApiError(response.status, await readErrorBody(response))
}

async function readErrorBody(response: Response): Promise<Partial<ApiErrorBody> | undefined> {
  try {
    return (await response.json()) as Partial<ApiErrorBody>
  } catch {
    // A proxy or crash page, not our envelope.
    return undefined
  }
}

export const api = {
  getHealth: (signal?: AbortSignal) =>
    apiFetch<HealthResponse>('/healthz', { signal, acceptStatuses: [503] }),
}

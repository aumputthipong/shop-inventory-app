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

// Branch on code, never on message: only code is a stable contract.
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
  acceptStatuses?: readonly number[]
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { acceptStatuses = [], headers, ...init } = options

  // Not an object spread: that drops a Headers instance or an array of pairs.
  const requestHeaders = new Headers(headers)
  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }

  const response = await fetch(path, { ...init, headers: requestHeaders })

  if (response.ok || acceptStatuses.includes(response.status)) {
    return (await response.json()) as T
  }

  throw new ApiError(response.status, await readErrorBody(response))
}

async function readErrorBody(response: Response): Promise<Partial<ApiErrorBody> | undefined> {
  try {
    return (await response.json()) as Partial<ApiErrorBody>
  } catch {
    return undefined
  }
}

export const api = {
  getHealth: (signal?: AbortSignal) =>
    apiFetch<HealthResponse>('/healthz', { signal, acceptStatuses: [503] }),
}

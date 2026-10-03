export type HealthStatus = 'ok' | 'degraded'
export type DependencyStatus = 'ok' | 'error'

export interface HealthResponse {
  status: HealthStatus
  db: DependencyStatus
}

export type Role = 'owner' | 'staff'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface DemoAccount {
  role: Role
  email: string
  password: string
}

export interface TeamMember extends User {
  is_active: boolean
  created_at: string
}

export type StockStatus = 'in_stock' | 'low' | 'out_of_stock'

export interface Product {
  id: number
  sku: string
  name: string
  price: string
  low_stock_threshold: number
  is_active: boolean
  on_hand: number
  reserved: number
  available: number
  stock_status: StockStatus
  created_at: string
  updated_at: string
}

export type Channel = 'store' | 'shopee' | 'line'
export type OrderStatus = 'reserved' | 'packed' | 'shipped' | 'canceled'
export type OrderAction = 'pack' | 'ship' | 'cancel'

export interface Hold {
  order_id: number
  order_no: string
  channel: Channel
  status: OrderStatus
  qty: number
  created_at: string
}

export interface ProductDetail extends Product {
  holds: Hold[]
}

export interface ProductInput {
  sku: string
  name: string
  price: string
  low_stock_threshold: number
  is_active?: boolean
  initial_qty?: number
}

export type MovementType = 'STOCK_IN' | 'ADJUST' | 'RESERVE' | 'RELEASE' | 'SHIP' | 'RETURN'
export type AdjustReason = 'count_correction' | 'damaged' | 'lost' | 'other'

export interface Movement {
  id: number
  product_id: number
  sku: string
  product_name: string
  type: MovementType
  qty_change: number
  reserved_change: number
  on_hand_after: number
  reserved_after: number
  available_after: number
  order_id: number | null
  order_no: string | null
  order_channel: Channel | null
  count_id: number | null
  receipt_id: number | null
  receipt_reference: string | null
  reason: string | null
  note: string | null
  created_by_name: string | null
  created_at: string
  reverses_id: number | null
  reversed: boolean
}

export interface Balance {
  product_id: number
  on_hand: number
  reserved: number
  available: number
}

export interface OrderItem {
  product_id: number
  sku: string
  name: string
  qty: number
  unit_price: string
}

export interface OrderSummary {
  id: number
  order_no: string
  channel: Channel
  external_ref: string | null
  status: OrderStatus
  total: string
  item_count: number
  created_by_name: string | null
  created_at: string
}

export interface Order {
  id: number
  order_no: string
  channel: Channel
  external_ref: string | null
  status: OrderStatus
  total: string
  note: string | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  packed_at: string | null
  shipped_at: string | null
  canceled_at: string | null
  items: OrderItem[]
  customer: OrderCustomer | null
}

export interface OrderCustomer {
  name: string
  phone: string
  address: string
  from_line: boolean
}

export type LineMode = 'off' | 'dev' | 'live'

export interface LineSettings {
  mode: LineMode
  liff_id: string
}

export interface LineCatalogItem {
  id: number
  name: string
  price: string
  stock_status: StockStatus
  available: number | null
}

export interface LineOrderInput {
  id_token: string
  name: string
  phone: string
  address: string
  note?: string
  items: { product_id: number; qty: number }[]
}

export interface LineReceipt {
  order_no: string
  status: OrderStatus
  total: string
  items: { name: string; qty: number; unit_price: string }[]
}

export interface NewOrder {
  channel: Channel
  external_ref?: string
  note?: string
  items: { product_id: number; qty: number }[]
  handed_over?: boolean
}

export interface Shortage {
  product_id: number
  sku: string
  name: string
  requested: number
  available: number
}

export interface NewReceipt {
  reference?: string
  note?: string
  lines: { product_id: number; qty: number }[]
}

export interface Receipt {
  id: number
  reference: string | null
  note: string | null
  created_at: string
  lines: {
    product_id: number
    sku: string
    name: string
    qty: number
    on_hand: number
    reserved: number
    available: number
  }[]
}

export type CountStatus = 'submitted' | 'approved' | 'rejected'

export interface CountLine {
  product_id: number
  sku: string
  name: string
  expected: number
  counted: number
  variance: number
  on_hand_now: number
}

export interface StockCount {
  id: number
  status: CountStatus
  note: string | null
  created_by_name: string | null
  decided_by_name: string | null
  created_at: string
  decided_at: string | null
  lines: CountLine[]
}

export interface CountSummary {
  id: number
  status: CountStatus
  note: string | null
  created_by_name: string | null
  created_at: string
  decided_at: string | null
  line_count: number
  diff_count: number
}

export interface NewCount {
  note?: string
  approve?: boolean
  lines: { product_id: number; counted: number }[]
}

export interface AuditLog {
  id: number
  action: string
  entity_type: string
  entity_id: number | null
  detail: Record<string, unknown>
  actor_name: string | null
  created_at: string
}

export interface Page<T> {
  items: T[]
  total: number
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
    details?: unknown
  }
}

// Branch on code, never on message: only code is a stable contract.
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | undefined
  readonly fields: FieldError[]
  readonly details: unknown

  constructor(status: number, body: Partial<ApiErrorBody> | undefined) {
    super(body?.error?.message ?? `request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = body?.error?.code ?? 'http_error'
    this.requestId = body?.error?.request_id
    this.fields = body?.error?.fields ?? []
    this.details = body?.error?.details
  }
}

export function isApiError(error: unknown, code?: string): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code)
}

export function shortagesOf(error: unknown): Shortage[] {
  if (!isApiError(error, 'insufficient_stock')) {
    return []
  }
  const details = error.details as { items?: Shortage[] } | undefined
  return details?.items ?? []
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

  if (response.status === 204) {
    return undefined as T
  }
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

function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value))
    }
  }
  const query = search.toString()
  return query ? `${path}?${query}` : path
}

export interface MovementQuery {
  product_id?: number
  type?: MovementType
  limit?: number
  offset?: number
}

export interface OrderQuery {
  status?: OrderStatus
  q?: string
  limit?: number
  offset?: number
}

export interface CountQuery {
  status?: CountStatus
  limit?: number
  offset?: number
}

export const api = {
  getHealth: (signal?: AbortSignal) =>
    apiFetch<HealthResponse>('/healthz', { signal, acceptStatuses: [503] }),

  login: (email: string, password: string) =>
    send<User>('POST', '/api/auth/login', { email, password }),
  logout: () => send<undefined>('POST', '/api/auth/logout'),
  me: (signal?: AbortSignal) => apiFetch<User>('/api/auth/me', { signal }),
  demoAccounts: (signal?: AbortSignal) =>
    apiFetch<{ items: DemoAccount[] }>('/api/auth/demo-accounts', { signal }).then((r) => r.items),
  changePassword: (input: { current_password: string; new_password: string }) =>
    send<undefined>('POST', '/api/auth/password', input),

  listProducts: (signal?: AbortSignal) =>
    apiFetch<{ items: Product[] }>('/api/products', { signal }).then((r) => r.items),
  getProduct: (id: number, signal?: AbortSignal) =>
    apiFetch<ProductDetail>(`/api/products/${id}`, { signal }),
  createProduct: (input: ProductInput) => send<ProductDetail>('POST', '/api/products', input),
  updateProduct: (id: number, patch: Partial<ProductInput>) =>
    send<ProductDetail>('PATCH', `/api/products/${id}`, patch),

  stockIn: (id: number, input: { qty: number; note?: string }) =>
    send<Balance>('POST', `/api/products/${id}/stock-in`, input),
  adjustStock: (id: number, input: { qty_change: number; reason: AdjustReason; note?: string }) =>
    send<Balance>('POST', `/api/products/${id}/adjustments`, input),
  receiveStock: (input: NewReceipt) => send<Receipt>('POST', '/api/receipts', input),
  reverseMovement: (id: number) => send<Balance>('POST', `/api/movements/${id}/reverse`),
  listMovements: (query: MovementQuery, signal?: AbortSignal) =>
    apiFetch<Page<Movement>>(withQuery('/api/movements', { ...query }), { signal }),

  listOrders: (query: OrderQuery, signal?: AbortSignal) =>
    apiFetch<Page<OrderSummary>>(withQuery('/api/orders', { ...query }), { signal }),
  getOrder: (id: number, signal?: AbortSignal) => apiFetch<Order>(`/api/orders/${id}`, { signal }),
  createOrder: (input: NewOrder) => send<Order>('POST', '/api/orders', input),
  orderAction: (id: number, action: OrderAction) =>
    send<Order>('POST', `/api/orders/${id}/${action}`),

  listCounts: (query: CountQuery, signal?: AbortSignal) =>
    apiFetch<Page<CountSummary>>(withQuery('/api/counts', { ...query }), { signal }),
  getCount: (id: number, signal?: AbortSignal) =>
    apiFetch<StockCount>(`/api/counts/${id}`, { signal }),
  createCount: (input: NewCount) => send<StockCount>('POST', '/api/counts', input),
  decideCount: (id: number, decision: 'approve' | 'reject') =>
    send<StockCount>('POST', `/api/counts/${id}/${decision}`),

  lineSettings: (signal?: AbortSignal) => apiFetch<LineSettings>('/api/line/settings', { signal }),
  lineCatalog: (signal?: AbortSignal) =>
    apiFetch<{ items: LineCatalogItem[] }>('/api/line/catalog', { signal }).then((r) => r.items),
  placeLineOrder: (input: LineOrderInput) => send<LineReceipt>('POST', '/api/line/orders', input),

  listAuditLogs: (query: { limit?: number; offset?: number }, signal?: AbortSignal) =>
    apiFetch<Page<AuditLog>>(withQuery('/api/audit-logs', { ...query }), { signal }),

  listUsers: (signal?: AbortSignal) =>
    apiFetch<{ items: TeamMember[] }>('/api/users', { signal }).then((r) => r.items),
  createUser: (input: { name: string; email: string; role: Role; password: string }) =>
    send<TeamMember>('POST', '/api/users', input),
  setUserActive: (id: number, isActive: boolean) =>
    send<TeamMember>('PATCH', `/api/users/${id}`, { is_active: isActive }),
  resetUserPassword: (id: number, password: string) =>
    send<undefined>('POST', `/api/users/${id}/password`, { password }),
}

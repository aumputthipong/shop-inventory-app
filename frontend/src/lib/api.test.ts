import { describe, expect, it, vi } from 'vitest'

import { ApiError, api, apiFetch, isApiError, shortagesOf } from '@/lib/api'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiFetch', () => {
  it('returns the parsed body for a 2xx response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, { status: 'ok', db: 'ok' }))

    await expect(api.getHealth()).resolves.toEqual({ status: 'ok', db: 'ok' })
  })

  it('treats a 503 from /healthz as data, not as a failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(503, { status: 'degraded', db: 'error' }),
    )

    await expect(api.getHealth()).resolves.toEqual({ status: 'degraded', db: 'error' })
  })

  it('throws an ApiError carrying the shared error envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(404, {
        error: { code: 'not_found', message: 'route not found', request_id: 'req-1' },
      }),
    )

    const error: unknown = await apiFetch('/nope').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'route not found',
      requestId: 'req-1',
    })
  })

  it('falls back to a generic ApiError when the body is not the envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad Gateway', { status: 502 }))

    const error: unknown = await apiFetch('/healthz').catch((e: unknown) => e)

    expect(error).toMatchObject({ status: 502, code: 'http_error' })
  })
})

describe('shortagesOf', () => {
  it('reads the short lines from an insufficient_stock error', () => {
    const error = new ApiError(409, {
      error: {
        code: 'insufficient_stock',
        message: 'stock changed',
        details: {
          items: [{ product_id: 2, sku: 'SKU-0002', name: 'jeans', requested: 3, available: 2 }],
        },
      },
    })

    expect(shortagesOf(error)).toEqual([
      { product_id: 2, sku: 'SKU-0002', name: 'jeans', requested: 3, available: 2 },
    ])
  })

  it('returns nothing for other errors', () => {
    expect(shortagesOf(new ApiError(500, undefined))).toEqual([])
    expect(shortagesOf(new Error('boom'))).toEqual([])
  })
})

describe('isApiError', () => {
  const conflict = new ApiError(409, { error: { code: 'insufficient_stock', message: 'short' } })

  it('recognises api errors, optionally by code', () => {
    expect(isApiError(conflict)).toBe(true)
    expect(isApiError(conflict, 'insufficient_stock')).toBe(true)
    expect(isApiError(conflict, 'invalid_state')).toBe(false)
  })

  it('rejects anything else', () => {
    expect(isApiError(new Error('boom'))).toBe(false)
    expect(isApiError(null)).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, UNAUTHORIZED_EVENT } from './api'

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (err) {
    return err
  }
  throw new Error('expected promise to reject')
}

describe('api()', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('dedupes concurrent refresh calls so refresh fires exactly once', async () => {
    const pathCallCounts = new Map<string, number>()
    let refreshCalls = 0

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/auth/refresh') {
        refreshCalls += 1
        return jsonResponse(200)
      }
      const count = (pathCallCounts.get(url) ?? 0) + 1
      pathCallCounts.set(url, count)
      // first two calls (the two concurrent original requests) fail with 401,
      // the retries that follow the refresh succeed
      if (count <= 2) return jsonResponse(401)
      return jsonResponse(200, { ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)

    const [a, b] = await Promise.all([api('/some/path'), api('/some/path')])

    expect(a).toEqual({ ok: true })
    expect(b).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)

    const refreshCallsMade = fetchMock.mock.calls.filter(([input]) => String(input) === '/api/auth/refresh')
    expect(refreshCallsMade).toHaveLength(1)
  })

  it('retries the original request after a successful refresh and resolves', async () => {
    let pathCalls = 0

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/auth/refresh') return jsonResponse(200)
      pathCalls += 1
      if (pathCalls === 1) return jsonResponse(401)
      return jsonResponse(200, { id: 42 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await api('/api/issues')

    expect(result).toEqual({ id: 42 })
  })

  it('does not dispatch UNAUTHORIZED_EVENT for an ordinary failed login', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, { error: 'סיסמה שגויה' }))
    vi.stubGlobal('fetch', fetchMock)

    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    let caught: unknown
    try {
      caught = await captureRejection(
        api('/api/auth/login', { method: 'POST', json: { username: 'x', password: 'wrong' } }),
      )
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, listener)
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(401)
    expect(listener).not.toHaveBeenCalled()
  })

  it('dispatches UNAUTHORIZED_EVENT when refresh fails and the request stays 401', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/auth/refresh') return jsonResponse(401)
      return jsonResponse(401)
    })
    vi.stubGlobal('fetch', fetchMock)

    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    let caught: unknown
    try {
      caught = await captureRejection(api('/api/issues'))
    } finally {
      window.removeEventListener(UNAUTHORIZED_EVENT, listener)
    }

    expect(caught).toBeInstanceOf(ApiError)
    expect((caught as ApiError).status).toBe(401)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

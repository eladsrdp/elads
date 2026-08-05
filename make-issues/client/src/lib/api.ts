// עטיפת fetch — JSON אוטומטי, ריענון access token שקוף בכשל 401, אירוע ניתוק אם גם הריענון נכשל.
export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const UNAUTHORIZED_EVENT = 'mi:unauthorized'

const DEFAULT_TIMEOUT_MS = 15000

async function rawFetch(path: string, init?: RequestInit & { json?: unknown }): Promise<Response> {
  const { json, signal, ...rest } = init ?? {}
  return fetch(path, {
    ...rest,
    credentials: 'include',
    signal: signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  })
}

let refreshPromise: Promise<boolean> | null = null

function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawFetch('/api/auth/refresh', { method: 'POST' })
      .then((res) => res.ok)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

const NO_RETRY_PATHS = new Set(['/api/auth/login', '/api/auth/refresh'])

function toApiError(err: unknown): ApiError {
  if (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return new ApiError(0, 'הבקשה ארכה זמן רב מדי — נסה שוב')
  }
  return new ApiError(0, 'אין חיבור לשרת — בדוק את הרשת')
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await rawFetch(path, init)
  } catch (err) {
    throw toApiError(err)
  }

  if (res.status === 401 && !NO_RETRY_PATHS.has(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      try {
        res = await rawFetch(path, init)
      } catch (err) {
        throw toApiError(err)
      }
    }
  }

  if (res.status === 401 && !NO_RETRY_PATHS.has(path)) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))

  if (!res.ok) {
    let message = 'שגיאה בשרת'
    try {
      const data = (await res.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // הגוף אינו JSON — נשארים עם הודעת ברירת המחדל
    }
    throw new ApiError(res.status, message)
  }

  return (await res.json()) as T
}

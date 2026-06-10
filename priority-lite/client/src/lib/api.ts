// עטיפת fetch — JSON אוטומטי, שגיאות בעברית, ו-401 שמדווח החוצה (ניתוק).

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export const UNAUTHORIZED_EVENT = 'pl:unauthorized'

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {}
  let res: Response
  try {
    res = await fetch(path, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    })
  } catch {
    throw new ApiError(0, 'אין חיבור לשרת — בדוק את הרשת')
  }

  if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))

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

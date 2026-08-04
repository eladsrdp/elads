// שולף תקלות לפי סטטוס, מרענן כל 15 שניות, ותומך בעדכון סטטוס אופטימי.
// pendingIds עוקב אחר תקלות שנמצאות באמצע resolve — מסנן אותן מתוצאות poll שעלולות
// "להחיות" תקלה שכבר הוסרה אופטימית לפני שה-PATCH הספיק להשלים בשרת.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Issue, IssueStatus } from '@make-issues/shared'
import { api } from '../lib/api'

const POLL_MS = 15000

export function useIssues(statuses: IssueStatus[]) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const statusParam = statuses.join(',')
  const pendingIds = useRef<Set<string>>(new Set())

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ issues: Issue[] }>(`/api/issues?status=${statusParam}`)
      setIssues(res.issues.filter((issue) => !pendingIds.current.has(issue.id)))
    } catch {
      // שגיאת רשת — נשארים עם הנתונים הקיימים, מנסים שוב ברענון הבא
    } finally {
      setLoading(false)
    }
  }, [statusParam])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(id)
  }, [refresh])

  const resolve = async (id: string, status: 'handled' | 'ignored') => {
    const previous = issues
    pendingIds.current.add(id)
    setIssues((current) => current.filter((issue) => issue.id !== id))
    try {
      await api(`/api/issues/${id}`, { method: 'PATCH', json: { status } })
    } catch {
      setIssues(previous)
    } finally {
      pendingIds.current.delete(id)
    }
  }

  return { issues, loading, resolve, refresh }
}

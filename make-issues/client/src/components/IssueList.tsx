import type { Issue } from '@make-issues/shared'
import type { ViewMode } from '../lib/viewMode'
import { IssueGrid } from './IssueGrid'
import { IssueTable } from './IssueTable'

interface Props {
  issues: Issue[]
  mode: ViewMode
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueList({ issues, mode, onResolve }: Props) {
  if (issues.length === 0) {
    return <p className="py-8 text-center text-slate-500">אין תקלות להצגה</p>
  }
  return mode === 'cards' ? (
    <IssueGrid issues={issues} onResolve={onResolve} />
  ) : (
    <IssueTable issues={issues} onResolve={onResolve} />
  )
}

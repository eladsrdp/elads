import type { Issue } from '@make-issues/shared'
import { IssueCard } from './IssueCard'

interface Props {
  issues: Issue[]
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueGrid({ issues, onResolve }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {issues.map((issue) => (
        <IssueCard
          key={issue.id}
          issue={issue}
          onResolve={onResolve ? (status) => onResolve(issue.id, status) : undefined}
        />
      ))}
    </div>
  )
}

import type { Issue } from '@make-issues/shared'
import { IssueBadge } from './IssueBadge'

interface Props {
  issue: Issue
  onResolve?: (status: 'handled' | 'ignored') => void
}

export function IssueCard({ issue, onResolve }: Props) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-slate-100">{issue.clientName}</strong>
        <IssueBadge type={issue.issueType} />
      </div>
      <div className="mt-1 text-sm text-slate-400">סנריו: {issue.scenarioName}</div>
      {issue.description && <p className="mt-2 text-sm text-slate-200">{issue.description}</p>}
      <div className="mt-2 flex gap-3 text-xs">
        <a className="text-sky-400 hover:underline" href={issue.scenarioLink} target="_blank" rel="noreferrer">
          🔗 סנריו
        </a>
        {issue.runLink && (
          <a className="text-sky-400 hover:underline" href={issue.runLink} target="_blank" rel="noreferrer">
            🔗 ריצה ספציפית
          </a>
        )}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        {onResolve
          ? new Date(issue.createdAt).toLocaleString('he-IL')
          : `טופל ע"י ${issue.resolvedBy} · ${issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleString('he-IL') : ''}`}
      </div>
      {onResolve && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => onResolve('handled')}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
          >
            ✔ טופל
          </button>
          <button
            type="button"
            onClick={() => onResolve('ignored')}
            className="rounded-lg bg-slate-600 px-3 py-1.5 text-sm text-white hover:bg-slate-500"
          >
            ✕ להתעלם
          </button>
        </div>
      )}
    </div>
  )
}

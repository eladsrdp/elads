import type { Issue } from '@make-issues/shared'
import { IssueBadge } from './IssueBadge'

interface Props {
  issues: Issue[]
  onResolve?: (id: string, status: 'handled' | 'ignored') => void
}

export function IssueTable({ issues, onResolve }: Props) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-slate-700 text-right text-slate-400">
          <th className="p-2">לקוח</th>
          <th className="p-2">סנריו</th>
          <th className="p-2">סוג</th>
          <th className="p-2">תיאור</th>
          <th className="p-2">קישורים</th>
          <th className="p-2">{onResolve ? 'פעולה' : 'טופל'}</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((issue) => (
          <tr key={issue.id} className="border-b border-slate-800">
            <td className="p-2">{issue.clientName}</td>
            <td className="p-2">{issue.scenarioName}</td>
            <td className="p-2">
              <IssueBadge type={issue.issueType} />
            </td>
            <td className="p-2">{issue.description}</td>
            <td className="p-2">
              <a className="text-sky-400 hover:underline" href={issue.scenarioLink} target="_blank" rel="noreferrer">
                סנריו
              </a>
              {issue.runLink && (
                <>
                  {' '}
                  /{' '}
                  <a className="text-sky-400 hover:underline" href={issue.runLink} target="_blank" rel="noreferrer">
                    ריצה
                  </a>
                </>
              )}
            </td>
            {onResolve ? (
              <td className="p-2">
                <button
                  type="button"
                  onClick={() => onResolve(issue.id, 'handled')}
                  className="mx-1 rounded bg-emerald-600 px-2 py-1 text-white"
                >
                  ✔
                </button>
                <button
                  type="button"
                  onClick={() => onResolve(issue.id, 'ignored')}
                  className="mx-1 rounded bg-slate-600 px-2 py-1 text-white"
                >
                  ✕
                </button>
              </td>
            ) : (
              <td className="p-2 text-slate-500">{issue.resolvedBy}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

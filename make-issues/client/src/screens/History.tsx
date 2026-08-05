import { IssueList } from '../components/IssueList'
import { ViewToggle } from '../components/ViewToggle'
import { useIssues } from '../state/useIssues'
import { useViewMode } from '../state/useViewMode'

export function History() {
  const { issues, loading } = useIssues(['handled', 'ignored'])
  const [mode, setMode] = useViewMode()

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">היסטוריה</h2>
        <ViewToggle mode={mode} onChange={setMode} />
      </div>
      {loading ? <p className="text-slate-500">טוען…</p> : <IssueList issues={issues} mode={mode} />}
    </div>
  )
}

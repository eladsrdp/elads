// מסך "סיכום" — היום / שבוע / חודש, פירוט לפי פרויקט ומשימה.
import { useState } from 'react'
import { rangeMonth, rangeToday, rangeWeek } from '../lib/date'
import { fmtMin } from '../lib/duration'
import { useRangeSummary } from '../state/useSummary'

type Range = 'today' | 'week' | 'month'

const RANGE_LABELS: Record<Range, string> = { today: 'היום', week: 'השבוע', month: 'החודש' }

export function Summary() {
  const [range, setRange] = useState<Range>('week')
  const { from, to } =
    range === 'today' ? rangeToday() : range === 'week' ? rangeWeek() : rangeMonth()
  const summary = useRangeSummary(from, to)

  return (
    <div className="space-y-4 pb-6">
      <div className="flex gap-1 rounded-xl bg-slate-800 p-1">
        {(['today', 'week', 'month'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-lg py-1.5 text-sm transition ${
              range === r ? 'bg-slate-600 text-slate-100' : 'text-slate-400'
            }`}
          >
            {RANGE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-slate-800/40 p-5 text-center ring-1 ring-slate-700/50">
        <p className="text-xs text-slate-500">סה״כ {RANGE_LABELS[range]}</p>
        <p className="ltr-nums text-5xl font-bold tabular-nums text-emerald-400">
          {fmtMin(summary?.totalMin ?? 0)}
        </p>
        {summary && summary.draftMin > 0 && (
          <p className="mt-1 text-xs text-amber-400">
            מתוכם {fmtMin(summary.draftMin)} עדיין בטיוטה (טרם נשלחו)
          </p>
        )}
      </div>

      {summary && summary.projects.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-600">אין דיווחים בטווח הזה</p>
      )}

      {(summary?.projects ?? []).map((p) => (
        <div key={p.projectName} className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-100">{p.projectName}</h3>
            <span className="ltr-nums font-bold tabular-nums text-emerald-400">
              {fmtMin(p.totalMin)}
            </span>
          </div>
          <div className="space-y-1.5">
            {p.tasks.map((t) => (
              <div key={t.taskId} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-400">{t.taskName}</span>
                <span className="ltr-nums shrink-0 tabular-nums text-slate-300">
                  {fmtMin(t.totalMin)}
                  {t.draftMin > 0 && <span className="text-amber-500"> *</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {summary && summary.draftMin > 0 && (
        <p className="text-center text-xs text-slate-600">* כולל שעות בטיוטה</p>
      )}
    </div>
  )
}

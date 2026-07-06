// מסך "סיכום" — היום / שבוע / חודש, פירוט לפי פרויקט ומשימה.
import { useState } from 'react'
import { rangeMonth, rangeToday, rangeWeek, workDaysElapsed } from '../lib/date'
import { fmtMin } from '../lib/duration'
import { useRangeSummary } from '../state/useSummary'

type Range = 'today' | 'week' | 'month'

const RANGE_LABELS: Record<Range, string> = { today: 'היום', week: 'השבוע', month: 'החודש' }

/** יעד: 9 שעות לכל יום עבודה (א׳–ה׳) שחלף. */
const REQUIRED_MIN_PER_WORKDAY = 9 * 60

export function Summary() {
  const [range, setRange] = useState<Range>('week')
  const { from, to } =
    range === 'today' ? rangeToday() : range === 'week' ? rangeWeek() : rangeMonth()
  const summary = useRangeSummary(from, to)

  const requiredMin = workDaysElapsed(from, to) * REQUIRED_MIN_PER_WORKDAY
  const reportedMin = summary?.totalMin ?? 0
  const diffMin = reportedMin - requiredMin
  const pct = requiredMin > 0 ? Math.min(100, Math.round((reportedMin / requiredMin) * 100)) : 0
  const targetLabel = range === 'today' ? 'יעד היום' : 'יעד עד היום'

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

        {requiredMin > 0 ? (
          <div className="mt-4 border-t border-slate-700/50 pt-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {targetLabel} <span className="ltr-nums tabular-nums text-slate-300">{fmtMin(requiredMin)}</span>
              </span>
              {diffMin >= 0 ? (
                <span className="ltr-nums font-semibold tabular-nums text-emerald-400">
                  עודף {fmtMin(diffMin)} ✓
                </span>
              ) : (
                <span className="ltr-nums font-semibold tabular-nums text-amber-400">
                  חסר {fmtMin(-diffMin)}
                </span>
              )}
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700/60">
              <div
                className={`h-full rounded-full transition-all ${diffMin >= 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          range === 'today' && (
            <p className="mt-3 border-t border-slate-700/50 pt-3 text-xs text-slate-500">
              היום לא יום עבודה — אין יעד
            </p>
          )
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

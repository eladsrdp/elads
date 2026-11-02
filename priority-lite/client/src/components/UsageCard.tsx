// כרטיס "שימוש ב-API של פריוריטי" — כמה קריאות (טרנזקציות) האפליקציה ביצעה, לפי יום ולפי ישות.
import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { fmtShortDate } from '../lib/date'
import { entityLabel, summarizeUsage } from '../lib/usageSummary'
import { useAuth } from '../state/useAuth'
import type { PriorityUsageRow } from '../types'

const DAYS = 14

export function UsageCard() {
  const { me } = useAuth()
  const [rows, setRows] = useState<PriorityUsageRow[] | null>(null)
  const [error, setError] = useState('')
  const [onlyMe, setOnlyMe] = useState(false)

  useEffect(() => {
    api<PriorityUsageRow[]>(`/api/usage/priority?days=${DAYS}`)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת הנתונים'))
  }, [])

  const summary = useMemo(
    () => summarizeUsage(rows ?? [], { empId: onlyMe ? me?.priorityEmpId : undefined }),
    [rows, onlyMe, me?.priorityEmpId],
  )
  const maxDay = Math.max(1, ...summary.byDay.map((d) => d.total))

  return (
    <div className="rounded-2xl bg-slate-800/40 p-4 ring-1 ring-slate-700/50">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium text-slate-400">שימוש ב-API של פריוריטי ({DAYS} ימים)</h3>
        <div className="flex gap-1">
          {[
            { label: 'כולם', value: false },
            { label: 'רק אני', value: true },
          ].map((o) => (
            <button
              key={o.label}
              onClick={() => setOnlyMe(o.value)}
              aria-pressed={onlyMe === o.value}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                onlyMe === o.value
                  ? 'border-emerald-600 bg-emerald-900/30 text-emerald-300'
                  : 'border-slate-700 text-slate-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-amber-400">{error}</p>}
      {!error && rows === null && <p className="text-sm text-slate-500">טוען…</p>}

      {rows !== null && (
        <>
          <p className="font-display ltr-nums text-3xl tabular-nums text-emerald-400">{summary.total.toLocaleString('he-IL')}</p>
          <p className="mb-3 text-xs text-slate-400">
            קריאות לפריוריטי
            {summary.errors > 0 ? ` · ${summary.errors.toLocaleString('he-IL')} נכשלו` : ''}
          </p>

          {summary.total === 0 ? (
            <p className="text-sm text-slate-500">עוד אין נתונים — הספירה מתחילה מרגע ההפעלה.</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {summary.byDay.map((d) => (
                  <div key={d.day} className="flex items-center gap-2 text-xs">
                    <span className="ltr-nums w-16 shrink-0 text-slate-400">{fmtShortDate(d.day)}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700/60">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(d.total / maxDay) * 100}%` }} />
                    </div>
                    <span className="ltr-nums w-12 shrink-0 text-left tabular-nums text-slate-200">{d.total}</span>
                  </div>
                ))}
              </div>

              <h4 className="mb-1.5 mt-4 text-xs font-medium text-slate-400">לפי נתון</h4>
              <div className="space-y-1">
                {summary.byEntity.map((e) => (
                  <div key={e.entity} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-slate-200">{entityLabel(e.entity)}</span>
                    <span className="ltr-nums shrink-0 text-xs tabular-nums text-slate-400">
                      {Object.entries(e.methods)
                        .map(([m, n]) => `${m} ${n}`)
                        .join(' · ')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

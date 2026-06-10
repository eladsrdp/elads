import type { ScopeId } from '../types'
import { useScopeData } from '../state/useData'
import { PulseGauge } from '../components/PulseGauge'
import { FlowChart } from '../components/FlowChart'
import { TransactionRow } from '../components/TransactionRow'
import { formatCurrency } from '../lib/currency'
import { useScope } from '../state/useData'

interface Props {
  scope: ScopeId
}

/** מסך 1 — הדשבורד המרכזי (The Pulse). */
export function Dashboard({ scope }: Props) {
  const scopeRow = useScope(scope)
  const { forecasts, result } = useScopeData(scope)

  if (!result || !scopeRow) {
    return <div className="p-6 text-center text-slate-500">טוען…</div>
  }

  // התנועות הצפויות בתוך חלון היעד בלבד (עד ה-10)
  const upcoming = forecasts.filter((t) => t.date <= result.targetDate)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-slate-800/40 px-4 py-3 text-center ring-1 ring-slate-700/50">
        <span className="text-sm text-slate-400">יתרה נוכחית · </span>
        <span className="ltr-nums font-semibold text-slate-100">
          {formatCurrency(scopeRow.currentBalance)}
        </span>
      </div>

      <PulseGauge result={result} />
      <FlowChart result={result} creditLimit={scopeRow.creditLimit} />

      <div>
        <h3 className="mb-1 px-1 text-sm font-semibold text-slate-400">
          תנועות צפויות עד יום היעד
        </h3>
        {upcoming.length === 0 ? (
          <p className="px-1 py-4 text-sm text-slate-500">
            אין תנועות צפויות עד ה-10. הוסף אותן בלשונית "ספר".
          </p>
        ) : (
          <div className="rounded-2xl bg-slate-800/30 px-3">
            {upcoming.map((t, i) => (
              <TransactionRow key={t.id ?? `gen-${i}`} tx={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

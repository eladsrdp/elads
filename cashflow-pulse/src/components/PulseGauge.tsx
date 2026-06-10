import type { ForecastResult } from '../types'
import { formatCurrency } from '../lib/currency'

interface Props {
  result: ForecastResult
}

/** ווידג'ט מדד ה-10: היתרה החזויה ליום היעד, סטטוס ירוק/אדום, ושורת דופק. */
export function PulseGauge({ result }: Props) {
  const danger = result.status === 'danger'
  const day = Number(result.targetDate.slice(8, 10))

  return (
    <div
      className={`rounded-3xl p-6 text-center shadow-lg ring-1 ${
        danger
          ? 'bg-rose-950/40 ring-rose-500/40'
          : 'bg-emerald-950/40 ring-emerald-500/40'
      }`}
    >
      <div className="text-sm font-medium text-slate-400">
        יתרה חזויה ל-{day} בחודש
      </div>
      <div
        className={`ltr-nums mt-2 text-5xl font-bold ${
          danger ? 'text-rose-400' : 'text-emerald-400'
        }`}
      >
        {formatCurrency(result.targetBalance)}
      </div>
      <div
        className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-semibold ${
          danger
            ? 'bg-rose-500/20 text-rose-300'
            : 'bg-emerald-500/20 text-emerald-300'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${danger ? 'bg-rose-400' : 'bg-emerald-400'}`} />
        {danger ? 'סכנת חריגה' : 'בטוח'}
      </div>

      <p className="mt-4 text-slate-300">
        {danger ? (
          <>
            חסרים לך עוד{' '}
            <span className="ltr-nums font-bold text-rose-300">
              {formatCurrency(result.shortfall)}
            </span>{' '}
            לעבור את ה-{day} בשלום.
          </>
        ) : (
          <>אתה עובר את ה-{day} בשלום. 🎉</>
        )}
        <br />
        <span className="text-slate-400">
          נותרו עוד <span className="ltr-nums">{result.daysRemaining}</span> ימים.
        </span>
      </p>
    </div>
  )
}

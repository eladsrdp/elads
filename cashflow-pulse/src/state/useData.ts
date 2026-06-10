// Hooks שמחברים את ה-DB (שאילתות חיות) למנוע התחזית.
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  computeForecast,
  expandRecurring,
  expandTransfers,
  type ForecastInput,
} from '../engine/forecast'
import { addDays, todayISO } from '../lib/date'
import type { ForecastResult, ScopeId, Transaction } from '../types'

/** חלון יצירת תנועות עתידיות לתצוגה (יומיים חודשים קדימה). */
const DISPLAY_WINDOW_DAYS = 62

export function useScopes() {
  return useLiveQuery(() => db.scopes.toArray(), [])
}

export function useScope(id: ScopeId) {
  return useLiveQuery(() => db.scopes.get(id), [id])
}

export interface ScopeData {
  /** תנועות שכבר ירדו/נכנסו. */
  actuals: Transaction[]
  /** תנועות צפויות (ידניות + מקבועות + מהעברות), בתוך חלון התצוגה. */
  forecasts: Transaction[]
  /** תוצאת מנוע התחזית עד יום היעד. */
  result: ForecastResult | undefined
}

/**
 * אוסף את כל הנתונים של כיס ומחשב את התחזית.
 * forecasts כולל תנועות forecast מאוחסנות + הרחבת קבועים והעברות לחלון התצוגה.
 */
export function useScopeData(scopeId: ScopeId): ScopeData {
  const data = useLiveQuery(async () => {
    const today = todayISO()
    const windowEnd = addDays(today, DISPLAY_WINDOW_DAYS)

    const [scope, txns, recurrings, transfers] = await Promise.all([
      db.scopes.get(scopeId),
      db.transactions.where('scopeId').equals(scopeId).toArray(),
      db.recurrings.where('scopeId').equals(scopeId).toArray(),
      db.transfers.toArray(),
    ])

    const actuals = txns.filter((t) => t.status === 'actual')
    const storedForecasts = txns.filter((t) => t.status === 'forecast')

    const generated = [
      ...expandRecurring(recurrings, today, windowEnd),
      ...expandTransfers(
        transfers.filter((t) => t.fromScope === scopeId || t.toScope === scopeId),
        today,
        windowEnd,
      ).filter((t) => t.scopeId === scopeId),
    ]

    const forecasts = [...storedForecasts, ...generated].sort((a, b) =>
      a.date.localeCompare(b.date),
    )

    const input: ForecastInput = {
      currentBalance: scope?.currentBalance ?? 0,
      creditLimit: scope?.creditLimit ?? 0,
      transactions: forecasts,
      today,
      targetDay: 10,
    }

    return { actuals, forecasts, result: computeForecast(input) }
  }, [scopeId])

  return data ?? { actuals: [], forecasts: [], result: undefined }
}

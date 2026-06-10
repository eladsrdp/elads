// מנוע התחזית — הליבה של האפליקציה. פונקציות טהורות, ללא תלות ב-UI או ב-DB.
import type {
  ForecastPoint,
  ForecastResult,
  PulseStatus,
  Recurring,
  Transaction,
  Transfer,
} from '../types'
import {
  daysBetween,
  eachDayInclusive,
  nextTargetDate,
  occurrencesInWindow,
} from '../lib/date'

export interface ForecastInput {
  /** היתרה הנוכחית, נכון להיום. כוללת כבר את כל תנועות ה-actual. */
  currentBalance: number
  /** מסגרת אשראי (סף חריגה). ההתרעה נדלקת כשהיתרה < -creditLimit. */
  creditLimit: number
  /** כל התנועות של הכיס. רק forecast בתוך הטווח [today, target] משפיעות. */
  transactions: Transaction[]
  /** היום הנוכחי כ-ISO. */
  today: string
  /** יום היעד בחודש. ברירת מחדל 10. */
  targetDay?: number
}

/**
 * מחשב את התחזית היומית מהיום ועד יום היעד.
 *
 * ForecastedBalance(day) = currentBalance + Σ(forecast amounts בטווח [today, day])
 *
 * תנועות actual מתעלמים מהן (כבר משוקללות ב-currentBalance). תנועות forecast
 * שמחוץ לטווח [today, target] לא נכנסות לחישוב.
 */
export function computeForecast(input: ForecastInput): ForecastResult {
  const { currentBalance, creditLimit, transactions, today } = input
  const targetDay = input.targetDay ?? 10
  const targetDate = nextTargetDate(today, targetDay)
  const threshold = -creditLimit

  // רק forecast בתוך הטווח [today, target]
  const relevant = transactions.filter(
    (t) =>
      t.status === 'forecast' &&
      daysBetween(today, t.date) >= 0 &&
      daysBetween(t.date, targetDate) >= 0,
  )

  const days = eachDayInclusive(today, targetDate)
  const points: ForecastPoint[] = days.map((date) => {
    const delta = relevant
      .filter((t) => daysBetween(t.date, date) >= 0) // t.date <= date
      .reduce((sum, t) => sum + t.amount, 0)
    const balance = currentBalance + delta
    const status: PulseStatus = balance < threshold ? 'danger' : 'safe'
    return { date, balance, status }
  })

  const minBalance = Math.min(...points.map((p) => p.balance))
  const targetBalance = points[points.length - 1].balance
  const breached = points.some((p) => p.status === 'danger')

  return {
    points,
    targetBalance,
    status: breached ? 'danger' : 'safe',
    shortfall: breached ? threshold - minBalance : 0,
    daysRemaining: daysBetween(today, targetDate),
    targetDate,
  }
}

/** מרחיב הגדרות קבועות לתנועות forecast קונקרטיות בתוך הטווח. */
export function expandRecurring(
  items: Recurring[],
  start: string,
  end: string,
): Transaction[] {
  const out: Transaction[] = []
  for (const item of items) {
    for (const date of occurrencesInWindow(item.dayOfMonth, start, end)) {
      out.push({
        scopeId: item.scopeId,
        amount: item.amount,
        date,
        description: item.description,
        status: 'forecast',
        source: 'recurring',
        recurringId: item.id,
      })
    }
  }
  return out
}

/** מרחיב העברות בין כיסים לזוגות תנועות forecast מקושרות (הוצאה במקור, הכנסה ביעד). */
export function expandTransfers(
  items: Transfer[],
  start: string,
  end: string,
): Transaction[] {
  const out: Transaction[] = []
  for (const item of items) {
    for (const date of occurrencesInWindow(item.dayOfMonth, start, end)) {
      out.push({
        scopeId: item.fromScope,
        amount: -Math.abs(item.amount),
        date,
        description: `העברה ל${item.toScope === 'home' ? 'בית' : 'עסק'}: ${item.description}`,
        status: 'forecast',
        source: 'transfer',
        transferId: item.id,
      })
      out.push({
        scopeId: item.toScope,
        amount: Math.abs(item.amount),
        date,
        description: `העברה מ${item.fromScope === 'home' ? 'בית' : 'עסק'}: ${item.description}`,
        status: 'forecast',
        source: 'transfer',
        transferId: item.id,
      })
    }
  }
  return out
}

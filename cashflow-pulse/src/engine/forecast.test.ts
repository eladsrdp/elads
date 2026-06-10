import { describe, it, expect } from 'vitest'
import { computeForecast, expandRecurring, expandTransfers } from './forecast'
import type { Recurring, Transaction, Transfer } from '../types'

const tx = (over: Partial<Transaction>): Transaction => ({
  scopeId: 'home',
  amount: 0,
  date: '2026-06-05',
  description: 't',
  status: 'forecast',
  source: 'manual',
  ...over,
})

describe('computeForecast', () => {
  it('flat balance with no transactions stays safe until target', () => {
    const r = computeForecast({
      currentBalance: 5000,
      creditLimit: 0,
      transactions: [],
      today: '2026-06-04',
      targetDay: 10,
    })
    expect(r.targetDate).toBe('2026-06-10')
    expect(r.points).toHaveLength(7) // 4..10 inclusive
    expect(r.points.every((p) => p.balance === 5000)).toBe(true)
    expect(r.status).toBe('safe')
    expect(r.targetBalance).toBe(5000)
    expect(r.shortfall).toBe(0)
    expect(r.daysRemaining).toBe(6)
  })

  it('forecast expense that breaches zero triggers danger and shortfall', () => {
    const r = computeForecast({
      currentBalance: 1000,
      creditLimit: 0,
      transactions: [tx({ amount: -3000, date: '2026-06-08' })],
      today: '2026-06-04',
      targetDay: 10,
    })
    expect(r.targetBalance).toBe(-2000)
    expect(r.status).toBe('danger')
    expect(r.shortfall).toBe(2000) // deepest dip below threshold (0)
  })

  it('credit limit cushions the dip and keeps it safe', () => {
    const r = computeForecast({
      currentBalance: 1000,
      creditLimit: 5000,
      transactions: [tx({ amount: -3000, date: '2026-06-08' })],
      today: '2026-06-04',
      targetDay: 10,
    })
    expect(r.targetBalance).toBe(-2000)
    expect(r.status).toBe('safe') // -2000 > -5000
    expect(r.shortfall).toBe(0)
  })

  it('ignores actual transactions (already reflected in currentBalance)', () => {
    const r = computeForecast({
      currentBalance: 1000,
      creditLimit: 0,
      transactions: [tx({ amount: -9999, status: 'actual', date: '2026-06-06' })],
      today: '2026-06-04',
      targetDay: 10,
    })
    expect(r.targetBalance).toBe(1000)
    expect(r.status).toBe('safe')
  })

  it('ignores forecast transactions outside the window', () => {
    const r = computeForecast({
      currentBalance: 1000,
      creditLimit: 0,
      transactions: [
        tx({ amount: -500, date: '2026-06-01' }), // before today
        tx({ amount: -500, date: '2026-06-20' }), // after target
      ],
      today: '2026-06-04',
      targetDay: 10,
    })
    expect(r.targetBalance).toBe(1000)
  })

  it('rolls to next month when today is past the target day', () => {
    const r = computeForecast({
      currentBalance: 0,
      creditLimit: 0,
      transactions: [],
      today: '2026-06-15',
      targetDay: 10,
    })
    expect(r.targetDate).toBe('2026-07-10')
  })

  it('clamps target to last day of a short month', () => {
    const r = computeForecast({
      currentBalance: 0,
      creditLimit: 0,
      transactions: [],
      today: '2026-02-27',
      targetDay: 30,
    })
    expect(r.targetDate).toBe('2026-02-28')
  })

  it('an income before target lifts the balance back to safe', () => {
    const r = computeForecast({
      currentBalance: 1000,
      creditLimit: 0,
      transactions: [
        tx({ amount: -3000, date: '2026-06-06' }),
        tx({ amount: 5000, date: '2026-06-09' }),
      ],
      today: '2026-06-04',
      targetDay: 10,
    })
    // dips to -2000 on the 6th (danger overall), recovers to 3000 by target
    expect(r.targetBalance).toBe(3000)
    expect(r.status).toBe('danger') // breached at some point
    expect(r.shortfall).toBe(2000)
  })
})

describe('expandRecurring', () => {
  it('creates a forecast transaction for each occurrence in the window', () => {
    const items: Recurring[] = [
      { id: 1, scopeId: 'home', amount: -4000, dayOfMonth: 5, description: 'שכירות' },
    ]
    const out = expandRecurring(items, '2026-06-01', '2026-06-10')
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      scopeId: 'home',
      amount: -4000,
      date: '2026-06-05',
      status: 'forecast',
      source: 'recurring',
      recurringId: 1,
    })
  })
})

describe('expandTransfers', () => {
  it('creates a linked expense+income pair across scopes', () => {
    const items: Transfer[] = [
      { id: 7, amount: 12000, dayOfMonth: 2, fromScope: 'business', toScope: 'home', description: 'משכורת' },
    ]
    const out = expandTransfers(items, '2026-06-01', '2026-06-10')
    expect(out).toHaveLength(2)
    const expense = out.find((t) => t.scopeId === 'business')!
    const income = out.find((t) => t.scopeId === 'home')!
    expect(expense.amount).toBe(-12000)
    expect(income.amount).toBe(12000)
    expect(expense.date).toBe('2026-06-02')
    expect(expense.source).toBe('transfer')
    expect(expense.transferId).toBe(7)
    expect(income.transferId).toBe(7)
  })
})

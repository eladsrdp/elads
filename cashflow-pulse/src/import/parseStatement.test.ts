import { describe, it, expect } from 'vitest'
import { parseAmountCell, parseDateCell, rowsToTransactions } from './parseStatement'

describe('parseDateCell', () => {
  it('parses ISO', () => expect(parseDateCell('2026-06-05')).toBe('2026-06-05'))
  it('parses DD/MM/YYYY', () => expect(parseDateCell('05/06/2026')).toBe('2026-06-05'))
  it('parses DD.MM.YYYY', () => expect(parseDateCell('5.6.2026')).toBe('2026-06-05'))
  it('parses 2-digit year', () => expect(parseDateCell('05/06/26')).toBe('2026-06-05'))
  it('returns null on junk', () => expect(parseDateCell('not a date')).toBeNull())
})

describe('parseAmountCell', () => {
  it('parses plain number', () => expect(parseAmountCell('5000')).toBe(5000))
  it('strips currency and commas', () => expect(parseAmountCell('₪1,234')).toBe(1234))
  it('keeps explicit negative', () => expect(parseAmountCell('-3,000')).toBe(-3000))
  it('treats parentheses as negative', () => expect(parseAmountCell('(2,000)')).toBe(-2000))
  it('returns null on empty', () => expect(parseAmountCell('  ')).toBeNull())
})

describe('rowsToTransactions', () => {
  const rows = [
    ['05/06/2026', 'סופר', '-250'],
    ['07/06/2026', 'משכורת', '12,000'],
    ['bad', 'row', 'x'],
  ]
  it('maps valid rows and skips invalid ones', () => {
    const { transactions, skippedRows } = rowsToTransactions(
      rows,
      { date: 0, description: 1, amount: 2 },
      'home',
    )
    expect(transactions).toHaveLength(2)
    expect(skippedRows).toBe(1)
    expect(transactions[0]).toMatchObject({
      date: '2026-06-05',
      amount: -250,
      description: 'סופר',
      status: 'actual',
      source: 'import',
      scopeId: 'home',
    })
  })

  it('honors invertSign for statements where expenses are positive', () => {
    const { transactions } = rowsToTransactions(
      [['05/06/2026', 'סופר', '250']],
      { date: 0, description: 1, amount: 2, invertSign: true },
      'home',
    )
    expect(transactions[0].amount).toBe(-250)
  })
})

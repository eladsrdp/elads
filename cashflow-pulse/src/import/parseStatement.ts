// ייבוא דפי תנועות מהבנק/אשראי (Excel/CSV) באמצעות SheetJS.
import * as XLSX from 'xlsx'
import type { ScopeId, Transaction } from '../types'
import { toISO } from '../lib/date'

export interface ParsedSheet {
  headers: string[]
  rows: string[][]
}

/** מיפוי עמודות שהמשתמש בוחר במסך הייבוא. */
export interface ColumnMapping {
  date: number
  description: number
  amount: number
  /** הופך את הסימן — לדפים שבהם הוצאות מופיעות כמספר חיובי. */
  invertSign?: boolean
}

/** קורא קובץ Excel/CSV ומחזיר כותרות + שורות גולמיות (כמחרוזות). */
export async function readSheet(file: File): Promise<ParsedSheet> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const first = wb.Sheets[wb.SheetNames[0]]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(first, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  })
  if (matrix.length === 0) return { headers: [], rows: [] }
  const headers = (matrix[0] as unknown[]).map((c) => String(c ?? '').trim())
  const rows = matrix.slice(1).map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()))
  return { headers, rows }
}

/** ממיר מחרוזת תאריך (פורמטים ישראליים נפוצים) ל-ISO. מחזיר null אם לא ניתן לפענח. */
export function parseDateCell(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO כבר: YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) {
    const [, y, m, d] = iso
    return toISO(new Date(Date.UTC(+y, +m - 1, +d)))
  }

  // DD/MM/YYYY או DD.MM.YYYY או DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/)
  if (dmy) {
    let [, d, m, y] = dmy
    let year = +y
    if (year < 100) year += 2000
    return toISO(new Date(Date.UTC(year, +m - 1, +d)))
  }

  return null
}

/** ממיר מחרוזת סכום (עם ₪, פסיקים, סוגריים לשליליים) למספר. */
export function parseAmountCell(raw: string): number | null {
  let s = raw.trim()
  if (!s) return null
  const negativeByParens = /^\(.*\)$/.test(s)
  s = s.replace(/[()₪,\s]/g, '').replace(/[^\d.\-]/g, '')
  if (s === '' || s === '-' || s === '.') return null
  let n = Number(s)
  if (Number.isNaN(n)) return null
  if (negativeByParens) n = -Math.abs(n)
  return n
}

export interface ConversionResult {
  transactions: Omit<Transaction, 'id'>[]
  skippedRows: number
}

/** ממיר שורות גולמיות לתנועות actual לפי המיפוי שנבחר. */
export function rowsToTransactions(
  rows: string[][],
  mapping: ColumnMapping,
  scopeId: ScopeId,
): ConversionResult {
  const transactions: Omit<Transaction, 'id'>[] = []
  let skippedRows = 0

  for (const row of rows) {
    const date = parseDateCell(row[mapping.date] ?? '')
    let amount = parseAmountCell(row[mapping.amount] ?? '')
    const description = (row[mapping.description] ?? '').trim() || 'תנועה מיובאת'

    if (date === null || amount === null) {
      skippedRows += 1
      continue
    }
    if (mapping.invertSign) amount = -amount

    transactions.push({
      scopeId,
      amount,
      date,
      description,
      status: 'actual',
      source: 'import',
    })
  }

  return { transactions, skippedRows }
}

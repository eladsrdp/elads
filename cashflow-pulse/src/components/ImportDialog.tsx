import { useState } from 'react'
import type { ScopeId } from '../types'
import {
  readSheet,
  rowsToTransactions,
  type ColumnMapping,
  type ParsedSheet,
} from '../import/parseStatement'
import { importTransactions } from '../db/operations'
import { Modal } from './Modal'
import { Field, PrimaryButton, Select } from './forms'

interface Props {
  open: boolean
  scope: ScopeId
  onClose: () => void
}

/** דיאלוג ייבוא: בחירת קובץ → מיפוי עמודות → ייבוא. */
export function ImportDialog({ open, scope, onClose }: Props) {
  const [sheet, setSheet] = useState<ParsedSheet | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({ date: 0, description: 1, amount: 2 })
  const [invert, setInvert] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  function reset() {
    setSheet(null)
    setDone(null)
    setInvert(false)
    setMapping({ date: 0, description: 1, amount: 2 })
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const parsed = await readSheet(file)
    setSheet(parsed)
    // ניחוש ראשוני: עמודה 0 תאריך, אחרונה סכום
    if (parsed.headers.length >= 3) {
      setMapping({ date: 0, description: 1, amount: parsed.headers.length - 1 })
    }
  }

  async function handleImport() {
    if (!sheet) return
    setBusy(true)
    const { transactions, skippedRows } = rowsToTransactions(
      sheet.rows,
      { ...mapping, invertSign: invert },
      scope,
    )
    const { added, skipped } = await importTransactions(transactions)
    setBusy(false)
    setDone(
      `יובאו ${added} תנועות. דולגו ${skipped} כפילויות ו-${skippedRows} שורות לא תקינות.`,
    )
  }

  const columnOptions = sheet
    ? sheet.headers.map((h, i) => (
        <option key={i} value={i}>
          {h || `עמודה ${i + 1}`}
        </option>
      ))
    : null

  return (
    <Modal
      open={open}
      title="ייבוא תנועות מקובץ"
      onClose={() => {
        reset()
        onClose()
      }}
    >
      {!sheet && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            בחר קובץ Excel או CSV שהורדת מאתר הבנק או חברת האשראי.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            className="block w-full text-sm text-slate-300 file:mr-3 file:rounded-xl file:border-0 file:bg-emerald-500 file:px-4 file:py-2 file:font-semibold file:text-slate-900"
          />
        </div>
      )}

      {sheet && !done && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            נמצאו {sheet.rows.length} שורות. התאם את העמודות:
          </p>
          <Field label="עמודת תאריך">
            <Select
              value={mapping.date}
              onChange={(e) => setMapping({ ...mapping, date: +e.target.value })}
            >
              {columnOptions}
            </Select>
          </Field>
          <Field label="עמודת תיאור">
            <Select
              value={mapping.description}
              onChange={(e) => setMapping({ ...mapping, description: +e.target.value })}
            >
              {columnOptions}
            </Select>
          </Field>
          <Field label="עמודת סכום">
            <Select
              value={mapping.amount}
              onChange={(e) => setMapping({ ...mapping, amount: +e.target.value })}
            >
              {columnOptions}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={invert}
              onChange={(e) => setInvert(e.target.checked)}
              className="h-4 w-4"
            />
            הפוך סימן (הוצאות מופיעות כמספר חיובי בקובץ)
          </label>
          <PrimaryButton onClick={handleImport} disabled={busy}>
            {busy ? 'מייבא…' : 'ייבא'}
          </PrimaryButton>
        </div>
      )}

      {done && (
        <div className="space-y-4 text-center">
          <p className="text-emerald-300">{done}</p>
          <PrimaryButton
            onClick={() => {
              reset()
              onClose()
            }}
          >
            סגור
          </PrimaryButton>
        </div>
      )}
    </Modal>
  )
}

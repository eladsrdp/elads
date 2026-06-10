import { useState } from 'react'
import type { ScopeId, Transaction } from '../types'
import { useScopeData } from '../state/useData'
import { TransactionRow } from '../components/TransactionRow'
import { Modal } from '../components/Modal'
import { ImportDialog } from '../components/ImportDialog'
import { Field, PrimaryButton, Select, TextInput } from '../components/forms'
import { addTransaction, confirmTransaction, deleteTransaction } from '../db/operations'
import { todayISO } from '../lib/date'

interface Props {
  scope: ScopeId
}

type LedgerTab = 'actual' | 'forecast'

/** מסך 2 — ניהול תנועות וצפויים (The Ledger). */
export function Ledger({ scope }: Props) {
  const { actuals, forecasts } = useScopeData(scope)
  const [tab, setTab] = useState<LedgerTab>('forecast')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const sortedActuals = [...actuals].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-4">
      <div className="flex rounded-full bg-slate-800 p-1 text-sm font-semibold">
        <button
          onClick={() => setTab('forecast')}
          className={`flex-1 rounded-full py-2 ${tab === 'forecast' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
        >
          מה שצפוי לרדת
        </button>
        <button
          onClick={() => setTab('actual')}
          className={`flex-1 rounded-full py-2 ${tab === 'actual' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'}`}
        >
          מה שכבר ירד
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setShowAdd(true)}
          className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-slate-900"
        >
          + הוסף צפוי
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-slate-100"
        >
          ⬆ ייבא קובץ
        </button>
      </div>

      <div className="rounded-2xl bg-slate-800/30 px-3">
        {tab === 'forecast' ? (
          forecasts.length === 0 ? (
            <Empty text="אין תנועות צפויות. הוסף צפוי או הגדר קבועים בהגדרות." />
          ) : (
            forecasts.map((t, i) => (
              <TransactionRow
                key={t.id ?? `gen-${i}`}
                tx={t}
                onConfirm={t.id ? () => confirmTransaction(t.id!) : undefined}
                onDelete={t.id && t.source === 'manual' ? () => deleteTransaction(t.id!) : undefined}
              />
            ))
          )
        ) : sortedActuals.length === 0 ? (
          <Empty text="עדיין אין תנועות שירדו. ייבא קובץ או אשר תנועה צפויה." />
        ) : (
          sortedActuals.map((t) => (
            <TransactionRow
              key={t.id}
              tx={t}
              onDelete={t.id ? () => deleteTransaction(t.id!) : undefined}
            />
          ))
        )}
      </div>

      <AddForecastModal open={showAdd} scope={scope} onClose={() => setShowAdd(false)} />
      <ImportDialog open={showImport} scope={scope} onClose={() => setShowImport(false)} />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="px-1 py-6 text-center text-sm text-slate-500">{text}</p>
}

function AddForecastModal({
  open,
  scope,
  onClose,
}: {
  open: boolean
  scope: ScopeId
  onClose: () => void
}) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')

  const valid = Number(amount) > 0 && date && description.trim()

  async function submit() {
    const magnitude = Math.abs(Number(amount))
    const tx: Omit<Transaction, 'id'> = {
      scopeId: scope,
      amount: kind === 'income' ? magnitude : -magnitude,
      date,
      description: description.trim(),
      status: 'forecast',
      source: 'manual',
    }
    await addTransaction(tx)
    setAmount('')
    setDescription('')
    setDate(todayISO())
    onClose()
  }

  return (
    <Modal open={open} title="הוספת תנועה צפויה" onClose={onClose}>
      <div className="space-y-3">
        <Field label="סוג">
          <Select value={kind} onChange={(e) => setKind(e.target.value as 'expense' | 'income')}>
            <option value="expense">הוצאה</option>
            <option value="income">הכנסה</option>
          </Select>
        </Field>
        <Field label="סכום (₪)">
          <TextInput
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="תאריך">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="תיאור">
          <TextInput
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="למשל: תשלום מלקוח X"
          />
        </Field>
        <PrimaryButton onClick={submit} disabled={!valid}>
          הוסף
        </PrimaryButton>
      </div>
    </Modal>
  )
}

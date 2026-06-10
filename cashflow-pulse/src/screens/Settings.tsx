import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Recurring, ScopeId } from '../types'
import { db } from '../db/db'
import { addRecurring, deleteRecurring, updateScope } from '../db/operations'
import { exportBackup, importBackup } from '../lib/backup'
import { useScopes } from '../state/useData'
import { Field, PrimaryButton, Select, TextInput } from '../components/forms'
import { formatCurrency } from '../lib/currency'

/** מסך הגדרות — כיסים, קבועים, גיבוי. */
export function Settings() {
  const scopes = useScopes()
  const recurrings = useLiveQuery(() => db.recurrings.toArray(), [])
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importBackup(file)
      setMsg('הגיבוי שוחזר בהצלחה.')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'שחזור נכשל')
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-400">כיסים</h3>
        <div className="space-y-3">
          {scopes?.map((s) => (
            <div key={s.id} className="rounded-2xl bg-slate-800/40 p-4">
              <div className="mb-2 font-semibold text-slate-100">{s.name}</div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="יתרה נוכחית (₪)">
                  <TextInput
                    type="number"
                    defaultValue={s.currentBalance}
                    onBlur={(e) => updateScope(s.id, { currentBalance: Number(e.target.value) })}
                  />
                </Field>
                <Field label="מסגרת אשראי (₪)">
                  <TextInput
                    type="number"
                    defaultValue={s.creditLimit}
                    onBlur={(e) => updateScope(s.id, { creditLimit: Number(e.target.value) })}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1 px-1 text-xs text-slate-500">השינוי נשמר אוטומטית ביציאה מהשדה.</p>
      </section>

      <RecurringSection recurrings={recurrings ?? []} />

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-400">גיבוי</h3>
        <div className="flex gap-2">
          <button
            onClick={() => exportBackup()}
            className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-slate-100"
          >
            ⬇ ייצוא גיבוי
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-xl bg-slate-700 py-2.5 text-sm font-semibold text-slate-100"
          >
            ⬆ שחזור גיבוי
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleRestore}
            className="hidden"
          />
        </div>
        {msg && <p className="mt-2 text-sm text-emerald-300">{msg}</p>}
      </section>
    </div>
  )
}

function RecurringSection({ recurrings }: { recurrings: Recurring[] }) {
  const [scope, setScope] = useState<ScopeId>('home')
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('1')
  const [description, setDescription] = useState('')

  const valid = Number(amount) > 0 && Number(day) >= 1 && Number(day) <= 31 && description.trim()

  async function submit() {
    const magnitude = Math.abs(Number(amount))
    await addRecurring({
      scopeId: scope,
      amount: kind === 'income' ? magnitude : -magnitude,
      dayOfMonth: Number(day),
      description: description.trim(),
    })
    setAmount('')
    setDescription('')
  }

  const label = (s: ScopeId) => (s === 'business' ? 'עסקי' : 'ביתי')

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-400">
        הוצאות והכנסות קבועות
      </h3>

      <div className="mb-3 rounded-2xl bg-slate-800/40 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="כיס">
            <Select value={scope} onChange={(e) => setScope(e.target.value as ScopeId)}>
              <option value="home">ביתי</option>
              <option value="business">עסקי</option>
            </Select>
          </Field>
          <Field label="סוג">
            <Select value={kind} onChange={(e) => setKind(e.target.value as 'expense' | 'income')}>
              <option value="expense">הוצאה</option>
              <option value="income">הכנסה</option>
            </Select>
          </Field>
          <Field label="סכום (₪)">
            <TextInput
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="יום בחודש">
            <TextInput type="number" value={day} onChange={(e) => setDay(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="תיאור">
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="שכירות / משכורת / ארנונה"
            />
          </Field>
        </div>
        <div className="mt-3">
          <PrimaryButton onClick={submit} disabled={!valid}>
            הוסף קבוע
          </PrimaryButton>
        </div>
      </div>

      {recurrings.length > 0 && (
        <div className="space-y-2">
          {recurrings.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 rounded-2xl bg-slate-800/40 px-4 py-3"
            >
              <div className="flex-1">
                <div className="font-medium text-slate-100">{r.description}</div>
                <div className="text-xs text-slate-500">
                  {label(r.scopeId)} · ב-<span className="ltr-nums">{r.dayOfMonth}</span> לחודש
                </div>
              </div>
              <div
                className={`ltr-nums font-semibold ${r.amount >= 0 ? 'text-emerald-400' : 'text-slate-200'}`}
              >
                {formatCurrency(r.amount)}
              </div>
              <button
                onClick={() => r.id && deleteRecurring(r.id)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

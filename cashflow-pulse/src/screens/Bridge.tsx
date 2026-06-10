import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { ScopeId } from '../types'
import { db } from '../db/db'
import { addTransfer, deleteTransfer } from '../db/operations'
import { Field, PrimaryButton, Select, TextInput } from '../components/forms'
import { formatCurrency } from '../lib/currency'

/** מסך 3 — גשר ההעברות בין כיסים (Inter-Account Bridge). */
export function Bridge() {
  const transfers = useLiveQuery(() => db.transfers.toArray(), [])
  const [from, setFrom] = useState<ScopeId>('business')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('2')
  const [description, setDescription] = useState('')

  const to: ScopeId = from === 'business' ? 'home' : 'business'
  const valid = Number(amount) > 0 && Number(day) >= 1 && Number(day) <= 31

  async function submit() {
    await addTransfer({
      amount: Math.abs(Number(amount)),
      dayOfMonth: Number(day),
      fromScope: from,
      toScope: to,
      description: description.trim() || 'העברה',
    })
    setAmount('')
    setDescription('')
  }

  const label = (s: ScopeId) => (s === 'business' ? 'עסק' : 'בית')

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-slate-800/40 p-5 ring-1 ring-slate-700/50">
        <p className="mb-4 text-sm text-slate-400">
          הזן העברה אחת — המערכת תרשום אוטומטית הוצאה חזויה בכיס המקור והכנסה חזויה
          בכיס היעד.
        </p>
        <div className="space-y-3">
          <Field label="מאיזה כיס">
            <Select value={from} onChange={(e) => setFrom(e.target.value as ScopeId)}>
              <option value="business">מהעסק → לבית</option>
              <option value="home">מהבית → לעסק</option>
            </Select>
          </Field>
          <Field label="סכום (₪)">
            <TextInput
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12000"
            />
          </Field>
          <Field label="יום בחודש">
            <TextInput
              type="number"
              inputMode="numeric"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
          </Field>
          <Field label="תיאור (אופציונלי)">
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="משכורת / דיבידנד"
            />
          </Field>
          <PrimaryButton onClick={submit} disabled={!valid}>
            הוסף העברה
          </PrimaryButton>
        </div>
      </div>

      <div>
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-400">העברות קבועות</h3>
        {!transfers || transfers.length === 0 ? (
          <p className="px-1 py-4 text-sm text-slate-500">עדיין לא הוגדרו העברות.</p>
        ) : (
          <div className="space-y-2">
            {transfers.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-2xl bg-slate-800/40 px-4 py-3"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-100">
                    {label(t.fromScope)} ← {label(t.toScope)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {t.description} · ב-<span className="ltr-nums">{t.dayOfMonth}</span> לחודש
                  </div>
                </div>
                <div className="ltr-nums font-semibold text-slate-200">
                  {formatCurrency(t.amount)}
                </div>
                <button
                  onClick={() => t.id && deleteTransfer(t.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

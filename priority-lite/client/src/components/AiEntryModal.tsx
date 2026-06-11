// הזנה חופשית בטקסט או קול — שולח ל-AI (Gemini), מציג תצוגה מקדימה של הדיווחים שזוהו,
// ומאפשר לשמור את כולם כטיוטות בבת אחת. תומך בכמה דיווחים מאותו טקסט.
import { useRef, useState } from 'react'
import { api } from '../lib/api'
import { fmtMin } from '../lib/duration'
import type { TaskSummary } from '../types'
import { Modal } from './Modal'

export interface ParsedEntry {
  task?: TaskSummary
  date?: string
  durationMin?: number
  note?: string
  billable?: boolean
  ordName?: string
  ordLine?: number
}

interface RawEntry {
  taskId?: string | null
  taskName?: string | null
  projectName?: string | null
  date?: string | null
  durationMin?: number | null
  note?: string | null
  ordName?: string | null
  ordLine?: number | null
  billable?: boolean | null
}

interface Props {
  open: boolean
  onClose: () => void
  /** נקרא עם כל הדיווחים שאושרו — ההורה יוצר טיוטה לכל אחד */
  onConfirm: (entries: ParsedEntry[]) => void
}

function toParsed(r: RawEntry): ParsedEntry {
  const parsed: ParsedEntry = {}
  if (r.taskId && r.taskName) {
    parsed.task = { id: r.taskId, name: r.taskName, projectId: '', projectName: r.projectName ?? '' }
  }
  if (r.date) parsed.date = r.date
  if (r.durationMin) parsed.durationMin = r.durationMin
  if (r.note) parsed.note = r.note
  if (r.billable != null) parsed.billable = r.billable
  if (r.ordName) parsed.ordName = r.ordName
  if (r.ordLine) parsed.ordLine = r.ordLine
  return parsed
}

export function AiEntryModal({ open, onClose, onConfirm }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<ParsedEntry[] | null>(null)
  const recognitionRef = useRef<{ stop(): void } | null>(null)

  const reset = () => {
    setText('')
    setPreview(null)
    setError('')
  }

  const close = () => {
    reset()
    onClose()
  }

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('הדפדפן שלך לא תומך בזיהוי קולי — נסה Chrome')
      return
    }
    const recognition = new SR()
    recognition.lang = 'he-IL'
    recognition.continuous = true // מאפשר משפט ארוך עם כמה דיווחים
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onerror = () => setError('זיהוי קולי נכשל — נסה שוב')
    recognition.onend = () => setListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
    setError('')
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const parse = async () => {
    if (!text.trim()) return setError('כתוב משהו קודם')
    setLoading(true)
    setError('')
    try {
      const result = await api<{ entries?: RawEntry[]; error?: string }>('/api/parse-entry', {
        method: 'POST',
        json: { text },
      })

      if (result.error) {
        setError(result.error)
        return
      }

      const entries = (result.entries ?? []).map(toParsed)
      if (entries.length === 0) {
        setError('לא זוהה אף דיווח — נסה לנסח אחרת')
        return
      }
      setPreview(entries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בפענוח')
    } finally {
      setLoading(false)
    }
  }

  const removePreview = (idx: number) => {
    setPreview((prev) => {
      if (!prev) return prev
      const next = prev.filter((_, i) => i !== idx)
      return next.length ? next : null
    })
  }

  const confirm = () => {
    if (!preview || preview.length === 0) return
    onConfirm(preview)
    close()
  }

  return (
    <Modal open={open} title="הוסף דיווח בטקסט חופשי" onClose={close}>
      {!preview ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            כתוב (או דבר) מה עשית. אפשר כמה דיווחים יחד — לדוגמה: "שעתיים על מיטל אדמוני ושעה וחצי על הליון, לחיוב"
          </p>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="שעתיים על פרויקט א' ושעה על פרויקט ב'…"
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              title={listening ? 'עצור הקלטה' : 'הקלט קול (עברית)'}
              className={`absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-lg transition ${
                listening
                  ? 'animate-pulse bg-rose-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {listening ? '■' : '🎙'}
            </button>
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <button
            onClick={parse}
            disabled={loading || !text.trim()}
            className="w-full rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {loading ? 'מפענח…' : 'פענח →'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            זוהו <span className="font-bold text-emerald-400">{preview.length}</span> דיווחים — בדוק ואשר:
          </p>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {preview.map((e, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-slate-700 bg-slate-800/60 p-3 pe-9"
              >
                <button
                  onClick={() => removePreview(i)}
                  title="הסר דיווח זה"
                  className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-700 hover:text-rose-400"
                >
                  ✕
                </button>

                {e.task ? (
                  <p className="font-medium text-slate-100">
                    {e.task.name}
                    {e.task.projectName ? (
                      <span className="text-xs text-slate-500"> · {e.task.projectName}</span>
                    ) : null}
                  </p>
                ) : (
                  <p className="text-sm text-amber-400">⚠ לא זוהתה משימה — תבחר בעריכת הטיוטה</p>
                )}

                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>⏱ {e.durationMin ? fmtMin(e.durationMin) : '—'}</span>
                  <span>📅 {e.date ?? 'היום'}</span>
                  {e.billable && <span className="text-emerald-400">לחיוב ✓</span>}
                  {e.ordName && <span>הזמנה {e.ordName}{e.ordLine != null ? `/${e.ordLine}` : ''}</span>}
                </div>
                {e.note && <p className="mt-1 text-xs text-slate-500">{e.note}</p>}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => setPreview(null)}
              className="rounded-xl border border-slate-700 px-4 py-3 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              חזרה
            </button>
            <button
              onClick={confirm}
              className="flex-1 rounded-xl bg-emerald-600 py-3 font-medium text-white transition hover:bg-emerald-500"
            >
              הוסף {preview.length > 1 ? `${preview.length} דיווחים` : 'דיווח'} כטיוטות
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

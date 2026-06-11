// הזנה חופשית בטקסט או קול — שולח ל-AI (Gemini) ומחזיר ערכים מולאים לטופס.
import { useRef, useState } from 'react'
import { api } from '../lib/api'
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

interface Props {
  open: boolean
  onClose: () => void
  onParsed: (entry: ParsedEntry) => void
}

export function AiEntryModal({ open, onClose, onParsed }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognitionRef = useRef<{ stop(): void } | null>(null)

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setError('הדפדפן שלך לא תומך בזיהוי קולי — נסה Chrome')
      return
    }
    const recognition = new SR()
    recognition.lang = 'he-IL'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (event: any) => {
      const transcript: string = event.results[0][0].transcript
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
      const result = await api<{
        taskId?: string | null
        taskName?: string | null
        projectName?: string | null
        date?: string | null
        durationMin?: number | null
        note?: string | null
        ordName?: string | null
        ordLine?: number | null
        billable?: boolean | null
        error?: string
      }>('/api/parse-entry', { method: 'POST', json: { text } })

      if ('error' in result && result.error) {
        setError(result.error)
        return
      }

      const parsed: ParsedEntry = {}
      if (result.taskId && result.taskName) {
        parsed.task = {
          id: result.taskId,
          name: result.taskName,
          projectId: '',
          projectName: result.projectName ?? '',
        }
      }
      if (result.date) parsed.date = result.date
      if (result.durationMin) parsed.durationMin = result.durationMin
      if (result.note) parsed.note = result.note
      if (result.billable != null) parsed.billable = result.billable
      if (result.ordName) parsed.ordName = result.ordName
      if (result.ordLine) parsed.ordLine = result.ordLine

      setText('')
      onParsed(parsed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בפענוח')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} title="הוסף דיווח בטקסט חופשי" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          כתוב (או דבר) מה עשית — לדוגמה: "שעתיים ורבע על PR26000029 היום, לחיוב"
        </p>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="שעתיים על פרויקט X אתמול…"
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
          {loading ? 'מפענח…' : 'פענח ומלא טופס →'}
        </button>
      </div>
    </Modal>
  )
}

// טיימר עמיד — נשמר ב-localStorage, הזמן תמיד מחושב now-startedAt
// כך שהוא שורד reload, sleep וסגירת ה-PWA.
// ה-state מוחזק ב-store מודולרי משותף (useSyncExternalStore) כדי שכל הרכיבים
// שמשתמשים ב-useTimer יראו את אותו מצב — עצירה ב-TimerCard מתעדכנת מיד גם ב"סה״כ היום".
import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { fmtClock, toISODate } from '../lib/date'
import { roundUpToQuarterHour } from '../lib/duration'
import type { LocalTimeEntry, TaskSummary } from '../types'

const KEY = 'pl.timer'
/** מעל 16 שעות — כנראה שכחו את הטיימר; שואלים במקום לשמור אוטומטית. */
export const STALE_MS = 16 * 3600_000

export interface RunningTimer {
  taskId: string
  taskName: string
  projectName: string
  startedAt: number
  /** "על מה עבדת" — נלכד תוך כדי הטיימר ועובר לטיוטה בעצירה (PDES בפריוריטי) */
  note?: string
}

function read(): RunningTimer | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? 'null') as RunningTimer | null
  } catch {
    return null
  }
}

// ---- store משותף ----
let current: RunningTimer | null = read()
const listeners = new Set<() => void>()

function setTimer(t: RunningTimer | null): void {
  current = t
  if (t) localStorage.setItem(KEY, JSON.stringify(t))
  else localStorage.removeItem(KEY)
  // איטרציה על העתק — מאזין עלול להירשם מחדש תוך כדי emit ולשבש את הסט המקורי
  for (const l of [...listeners]) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  // סנכרון בין טאבים — שינוי ב-localStorage מטאב אחר
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = read()
      cb()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(cb)
    window.removeEventListener('storage', onStorage)
  }
}

export function useTimer() {
  const running = useSyncExternalStore(subscribe, () => current)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  const start = (task: TaskSummary) => {
    setTimer({
      taskId: task.id,
      taskName: task.name,
      projectName: task.projectName,
      startedAt: Date.now(),
    })
    setNow(Date.now())
  }

  const discard = () => setTimer(null)

  /** עדכון "על מה עבדת" תוך כדי ריצת הטיימר — נשמר מיד ל-localStorage */
  const updateNote = (note: string) => {
    if (!current) return
    setTimer({ ...current, note })
  }

  /** עוצר את הטיימר ושומר טיוטה. מעגל לדקה שלמה (מינימום 1). */
  const stop = async (): Promise<LocalTimeEntry | null> => {
    if (!current) return null
    const stoppedAt = Date.now()
    const entry: LocalTimeEntry = {
      id: crypto.randomUUID(),
      status: 'draft',
      date: toISODate(new Date(current.startedAt)),
      taskId: current.taskId,
      taskName: current.taskName,
      projectName: current.projectName,
      durationMin: roundUpToQuarterHour(
        Math.max(1, Math.round((stoppedAt - current.startedAt) / 60_000)),
      ),
      startTime: fmtClock(current.startedAt),
      endTime: fmtClock(stoppedAt),
      note: current.note?.trim() || undefined,
      source: 'timer',
      createdAt: stoppedAt,
    }
    await db.timeEntries.add(entry)
    setTimer(null)
    return entry
  }

  const elapsedMs = running ? Math.max(0, now - running.startedAt) : 0
  return { running, elapsedMs, isStale: elapsedMs > STALE_MS, start, stop, discard, updateNote }
}

/** "1:23:45" מתוך אלפיות — לתצוגת הטיימר הרץ. */
export function fmtElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

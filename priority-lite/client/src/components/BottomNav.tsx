import type { ReactNode } from 'react'
import { ChartIcon, ChecklistIcon, ClipboardIcon, ClockIcon, ListIcon, SlidersIcon } from './icons'

export type Tab = 'today' | 'entries' | 'tasks' | 'mine' | 'summary' | 'settings'

interface Props {
  value: Tab
  onChange: (t: Tab) => void
  pendingCount?: number
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'today', label: 'היום', icon: <ClockIcon size={22} /> },
  { id: 'entries', label: 'דיווחים', icon: <ListIcon size={22} /> },
  { id: 'tasks', label: 'משימות', icon: <ClipboardIcon size={22} /> },
  { id: 'mine', label: 'שלי', icon: <ChecklistIcon size={22} /> },
  { id: 'summary', label: 'סיכום', icon: <ChartIcon size={22} /> },
  { id: 'settings', label: 'הגדרות', icon: <SlidersIcon size={22} /> },
]

/** ניווט תחתון קבוע, בסגנון אפליקציית מובייל. הטאב הפעיל מסומן בכתום ובפס עליון. */
export function BottomNav({ value, onChange, pendingCount = 0 }: Props) {
  return (
    <nav
      className="sticky bottom-0 z-40 flex border-t border-slate-700 bg-slate-900/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {TABS.map((t) => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition ${
              active ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {active && (
              <span className="absolute inset-x-[30%] top-0 h-0.5 rounded-b-full bg-emerald-500" aria-hidden="true" />
            )}
            {t.icon}
            {t.label}
            {t.id === 'entries' && pendingCount > 0 && (
              <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-slate-900">
                {pendingCount}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

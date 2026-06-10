export type Tab = 'today' | 'entries' | 'summary' | 'settings'

interface Props {
  value: Tab
  onChange: (t: Tab) => void
  pendingCount?: number
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'today', label: 'היום', icon: '🕒' },
  { id: 'entries', label: 'דיווחים', icon: '📋' },
  { id: 'summary', label: 'סיכום', icon: '📊' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

/** ניווט תחתון קבוע, בסגנון אפליקציית מובייל. */
export function BottomNav({ value, onChange, pendingCount = 0 }: Props) {
  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
            value === t.id ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          {t.label}
          {t.id === 'entries' && pendingCount > 0 && (
            <span className="absolute right-1/2 top-1 translate-x-4 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-slate-900">
              {pendingCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

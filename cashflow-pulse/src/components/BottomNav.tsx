export type Tab = 'dashboard' | 'ledger' | 'bridge' | 'settings'

interface Props {
  value: Tab
  onChange: (t: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'דופק', icon: '📊' },
  { id: 'ledger', label: 'ספר', icon: '📒' },
  { id: 'bridge', label: 'העברות', icon: '🔁' },
  { id: 'settings', label: 'הגדרות', icon: '⚙️' },
]

/** ניווט תחתון קבוע, בסגנון אפליקציית מובייל. */
export function BottomNav({ value, onChange }: Props) {
  return (
    <nav className="sticky bottom-0 z-40 flex border-t border-slate-800 bg-slate-900/95 backdrop-blur">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition ${
            value === t.id ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <span className="text-lg">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

import { useAuth } from '../state/useAuth'

export type Tab = 'open' | 'history'

export function TopNav({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { logout } = useAuth()

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('open')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'open' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        >
          פתוחות
        </button>
        <button
          type="button"
          onClick={() => onChange('history')}
          className={`rounded-lg px-3 py-1.5 text-sm ${tab === 'history' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
        >
          היסטוריה
        </button>
      </div>
      <button type="button" onClick={() => void logout()} className="text-sm text-slate-500 hover:text-slate-300">
        התנתקות
      </button>
    </nav>
  )
}

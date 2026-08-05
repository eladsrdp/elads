import type { ViewMode } from '../lib/viewMode'

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-700 p-0.5">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`rounded-md px-3 py-1 text-sm ${mode === 'cards' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
      >
        כרטיסים
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`rounded-md px-3 py-1 text-sm ${mode === 'table' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'}`}
      >
        טבלה
      </button>
    </div>
  )
}

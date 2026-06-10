import type { ScopeId } from '../types'

interface Props {
  value: ScopeId
  onChange: (s: ScopeId) => void
}

/** סוויץ' עליון להחלפה בין הכיס העסקי לביתי. */
export function ScopeSwitch({ value, onChange }: Props) {
  const options: { id: ScopeId; label: string }[] = [
    { id: 'business', label: 'עסקי' },
    { id: 'home', label: 'ביתי' },
  ]
  return (
    <div className="flex rounded-full bg-slate-800 p-1 text-sm font-semibold">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex-1 rounded-full px-4 py-2 transition ${
            value === opt.id
              ? 'bg-slate-100 text-slate-900 shadow'
              : 'text-slate-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

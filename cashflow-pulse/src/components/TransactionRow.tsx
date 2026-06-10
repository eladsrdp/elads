import type { Transaction } from '../types'
import { formatSigned } from '../lib/currency'

interface Props {
  tx: Transaction
  /** מוצג רק בתנועות forecast שניתן לאשר (יש להן id מאוחסן). */
  onConfirm?: () => void
  onDelete?: () => void
}

const SOURCE_LABELS: Record<Transaction['source'], string> = {
  manual: 'ידני',
  import: 'יובא',
  recurring: 'קבוע',
  transfer: 'העברה',
}

export function TransactionRow({ tx, onConfirm, onDelete }: Props) {
  const income = tx.amount >= 0
  const day = Number(tx.date.slice(8, 10))
  const month = Number(tx.date.slice(5, 7))

  return (
    <div className="flex items-center gap-3 border-b border-slate-800 py-3">
      <div className="flex h-10 w-12 flex-col items-center justify-center rounded-xl bg-slate-800 text-slate-300">
        <span className="ltr-nums text-sm font-bold leading-none">{day}</span>
        <span className="ltr-nums text-[10px] text-slate-500">/{month}</span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-slate-100">{tx.description}</div>
        <div className="text-xs text-slate-500">{SOURCE_LABELS[tx.source]}</div>
      </div>

      <div
        className={`ltr-nums font-semibold ${income ? 'text-emerald-400' : 'text-slate-200'}`}
      >
        {formatSigned(tx.amount)}
      </div>

      {onConfirm && (
        <button
          onClick={onConfirm}
          title="אשר שבוצע"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 transition hover:bg-emerald-500/40"
        >
          ✓
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          title="מחק"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-300"
        >
          ✕
        </button>
      )}
    </div>
  )
}

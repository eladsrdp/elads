// שורת משימה ברשימת המשימות — מספר, נושא, לקוח, סטטוס, תאריכים, ולמי משויכת (אופציונלי).
import { fmtShortDate } from '../lib/date'
import type { CustNote } from '../types'

interface Props {
  note: CustNote
  onOpen: (id: number) => void
  /** שם/‏login של איש הטיפול — מוצג רק כשהרשימה לא מקובצת לפי אדם */
  handlerLabel?: string
}

export function TaskRow({ note: n, onOpen, handlerLabel }: Props) {
  const meta = [
    handlerLabel ? `לטיפול: ${handlerLabel}` : null,
    n.openDate ? `נפתחה ${fmtShortDate(n.openDate)}` : null,
    n.tillDate ? `יעד ${fmtShortDate(n.tillDate)}` : null,
  ].filter(Boolean)

  return (
    <button
      onClick={() => onOpen(n.id)}
      className="block w-full rounded-2xl bg-slate-800/40 p-3 text-right ring-1 ring-slate-700/50"
    >
      <span className="block font-medium text-slate-100">
        <span className="ml-1.5 text-xs font-normal text-slate-500">#{n.id}</span>
        {n.subject}
      </span>
      <span className="block text-xs text-slate-500">
        {n.custDes}
        {n.statDes ? ` · ${n.statDes}` : ''}
      </span>
      {meta.length > 0 && <span className="block text-xs text-slate-600">{meta.join(' · ')}</span>}
    </button>
  )
}

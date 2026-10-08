// קיבוץ משימות לקוח לפי איש "לטיפול" — לתצוגת "לפי אדם" במסך המשימות.
import type { CustNote } from '../types'

export const UNASSIGNED_KEY = '__unassigned__'

export interface TaskGroup {
  key: string
  label: string
  isMe: boolean
  notes: CustNote[]
}

/**
 * @param meEmpId ה-login של המשתמש המחובר — הקבוצה שלו תמיד ראשונה
 * @param names login → שם מלא (רק לעובדי priority-lite; לאחרים מציגים את ה-login)
 */
export function groupByHandler(
  notes: CustNote[],
  meEmpId: string | undefined,
  names: Record<string, string>,
): TaskGroup[] {
  const byKey = new Map<string, CustNote[]>()
  for (const n of notes) {
    const key = n.handlerEmpId || UNASSIGNED_KEY
    const list = byKey.get(key)
    if (list) list.push(n)
    else byKey.set(key, [n])
  }

  const groups: TaskGroup[] = [...byKey.entries()].map(([key, list]) => ({
    key,
    label: key === UNASSIGNED_KEY ? 'ללא שיוך' : (names[key] ?? key),
    isMe: key !== UNASSIGNED_KEY && key === meEmpId,
    notes: [...list].sort((a, b) => b.id - a.id),
  }))

  const rank = (g: TaskGroup) => (g.isMe ? 0 : g.key === UNASSIGNED_KEY ? 2 : 1)
  return groups.sort((a, b) => rank(a) - rank(b) || a.label.localeCompare(b.label, 'he'))
}

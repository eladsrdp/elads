import { describe, expect, it } from 'vitest'
import type { CustNote } from '../types'
import { UNASSIGNED_KEY, groupByHandler } from './groupTasks'

function note(id: number, handlerEmpId?: string): CustNote {
  return { id, subject: `משימה ${id}`, custName: 'C1', custDes: 'לקוח', handlerEmpId }
}

describe('groupByHandler', () => {
  it('מקבץ לפי איש "לטיפול", וסופר נכון', () => {
    const groups = groupByHandler([note(1, 'a'), note(2, 'b'), note(3, 'a')], undefined, {})
    expect(groups.map((g) => [g.key, g.notes.length]).sort()).toEqual([['a', 2], ['b', 1]])
  })

  it('המשתמש המחובר תמיד ראשון, גם כשהוא אחרי הא"ב', () => {
    const groups = groupByHandler([note(1, 'a'), note(2, 'z')], 'z', {})
    expect(groups[0].key).toBe('z')
    expect(groups[0].isMe).toBe(true)
    expect(groups[1].isMe).toBe(false)
  })

  it('שאר הקבוצות ממוינות לפי השם המוצג, לא לפי ה-login', () => {
    const names = { x1: 'דנה', x2: 'אבי' }
    const groups = groupByHandler([note(1, 'x1'), note(2, 'x2')], undefined, names)
    expect(groups.map((g) => g.label)).toEqual(['אבי', 'דנה'])
  })

  it('בלי שם ידוע — מציג את ה-login', () => {
    const groups = groupByHandler([note(1, 'rdabush')], undefined, {})
    expect(groups[0].label).toBe('rdabush')
  })

  it('משימות בלי שיוך נכנסות לקבוצה אחת, אחרונה', () => {
    const groups = groupByHandler([note(1), note(2, 'a'), note(3, '')], undefined, {})
    const last = groups[groups.length - 1]
    expect(last.key).toBe(UNASSIGNED_KEY)
    expect(last.label).toBe('ללא שיוך')
    expect(last.notes.map((n) => n.id).sort()).toEqual([1, 3])
  })

  it('בתוך קבוצה — החדשה ביותר (id גבוה) ראשונה', () => {
    const groups = groupByHandler([note(5, 'a'), note(9, 'a'), note(7, 'a')], undefined, {})
    expect(groups[0].notes.map((n) => n.id)).toEqual([9, 7, 5])
  })

  it('רשימה ריקה — מחזיר מערך ריק', () => {
    expect(groupByHandler([], 'me', {})).toEqual([])
  })
})

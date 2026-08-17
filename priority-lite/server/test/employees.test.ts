import { describe, expect, it } from 'vitest'
import { createLocalDb } from '../src/db/local-impl'

describe('listActiveEmployees', () => {
  it('מחזיר רק עובדים פעילים', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: '0501111111', email: 'a@test.co', priorityEmpId: '42', name: 'אלעד' })
    await db.upsertEmployee({ phone: '0502222222', email: 'b@test.co', priorityEmpId: '99', name: 'רועי', active: false })

    const employees = await db.listActiveEmployees()
    expect(employees).toHaveLength(1)
    expect(employees[0].priority_emp_id).toBe('42')
  })

  it('בלי עובדים — מערך ריק', async () => {
    const db = createLocalDb('__nonexistent__')
    expect(await db.listActiveEmployees()).toEqual([])
  })

  it('ממוין לפי שם — עקבי עם supabase-impl', async () => {
    const db = createLocalDb('__nonexistent__')
    await db.upsertEmployee({ phone: '0501111111', email: 'c@test.co', priorityEmpId: '3', name: 'רועי' })
    await db.upsertEmployee({ phone: '0502222222', email: 'a@test.co', priorityEmpId: '1', name: 'אלעד' })
    await db.upsertEmployee({ phone: '0503333333', email: 'b@test.co', priorityEmpId: '2', name: 'בני' })

    const employees = await db.listActiveEmployees()
    expect(employees.map((e) => e.name)).toEqual(['אלעד', 'בני', 'רועי'])
  })
})

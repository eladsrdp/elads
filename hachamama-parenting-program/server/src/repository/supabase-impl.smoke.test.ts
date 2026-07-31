// בדיקת עשן אמיתית מול Supabase — רצה רק כש-SUPABASE_URL/SUPABASE_SERVICE_KEY מוגדרים
// בסביבה. לפני שהיא תעבור: הרץ את migrations/0001_init.sql על פרויקט Supabase ריק.
import { describe, expect, it } from 'vitest'
import { createSupabaseDb } from './supabase-impl'

const hasSupabaseEnv = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY

describe.skipIf(!hasSupabaseEnv)('createSupabaseDb (smoke test מול Supabase אמיתי)', () => {
  it('יוצר נרשם אמיתי ומוצא אותו לפי טלפון', async () => {
    const db = createSupabaseDb(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const uniquePhone = `+972500${Date.now().toString().slice(-6)}`
    const created = await db.createParticipant({
      fullName: 'בדיקת עשן',
      phone: uniquePhone,
      signupSourceRef: null,
      signupAt: new Date().toISOString(),
      day1Date: '2099-01-01',
    })
    expect(created.id).toBeTruthy()

    const found = await db.findParticipantByPhone(uniquePhone)
    expect(found?.id).toBe(created.id)
  })
})

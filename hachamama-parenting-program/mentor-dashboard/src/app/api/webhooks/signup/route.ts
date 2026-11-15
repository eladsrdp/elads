// Webhook הרשמה — מוזרם מהמערכת החיצונית שמנהלת את ההרשמה לקורס.
// SECURITY: חשוף לאינטרנט, מוגן בסוד משותף ב-Authorization header, לא רק CORS/רשת.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { calculateDay1Date, isValidTimezone } from '@/engine/domain/scheduling'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

const SignupSchema = z.object({
  fullName: z.string().min(1).max(200),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'טלפון חייב להיות בפורמט E.164, למשל +972501234567'),
  signupSourceRef: z.string().max(200).optional(),
  // אזור-זמן IANA של הנרשמת (למשל America/New_York). ללא — ברירת מחדל Asia/Jerusalem.
  timezone: z.string().max(64).refine(isValidTimezone, 'אזור זמן לא תקין').optional(),
})

export async function POST(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.SIGNUP_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const parsed = SignupSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'גוף בקשה לא תקין' }, { status: 400 })
  }

  const db = await getDb()

  // idempotent לפי טלפון — ה-DB אוכף unique על phone (ראו server/migrations/0001_init.sql).
  const existing = await db.findParticipantByPhone(parsed.data.phone)
  if (existing) {
    return NextResponse.json({ participantId: existing.id, day1Date: existing.day1_date })
  }

  const signupAt = new Date().toISOString()
  const day1Date = calculateDay1Date(new Date(signupAt), parsed.data.timezone)

  const participant = await db.createParticipant({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    signupSourceRef: parsed.data.signupSourceRef ?? null,
    signupAt,
    day1Date,
    timezone: parsed.data.timezone,
  })

  return NextResponse.json({ participantId: participant.id, day1Date: participant.day1_date }, { status: 201 })
}

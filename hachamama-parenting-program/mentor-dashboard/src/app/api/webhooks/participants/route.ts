// Endpoint למשיכת כל הנרשמים (שם/טלפון/סטטוס/יום1/מנחה מוצמדת) — למערכת חיצונית
// (Make.com) שצריכה את הרשימה המלאה. SECURITY: חשוף לאינטרנט, מוגן בסוד משותף
// ב-Authorization header (אותו סוד ש-Make.com כבר משתמש בו ל-webhook לחיצת הכפתור) —
// לא רק CORS/רשת. מחזיר PII (שם מלא + טלפון) — לעולם לא בלי הבדיקה הזו.
import { NextResponse } from 'next/server'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const db = await getDb()
  const participants = await db.getAllParticipants()

  return NextResponse.json({
    participants: participants.map((p) => ({
      participantId: p.id,
      fullName: p.full_name,
      phone: p.phone,
      status: p.status,
      day1Date: p.day1_date,
      signupAt: p.signup_at,
      signupSourceRef: p.signup_source_ref,
      assignedMentorId: p.assigned_mentor_id,
    })),
  })
}

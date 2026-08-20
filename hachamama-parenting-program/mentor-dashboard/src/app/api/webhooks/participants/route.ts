// Endpoint למשיכת כל הנרשמים (שם/טלפון/סטטוס/יום1/מנחה מוצמדת) + סטטוס טריגר-הבוקר
// של היום (נשלח? נלחץ?) — למערכת חיצונית (Make.com) שצריכה גם את מי שלא לחץ היום.
// SECURITY: חשוף לאינטרנט, מוגן בסוד משותף ב-Authorization header (אותו סוד ש-Make.com
// כבר משתמש בו ל-webhook לחיצת הכפתור) — לא רק CORS/רשת. מחזיר PII (שם מלא + טלפון) —
// לעולם לא בלי הבדיקה הזו.
import { NextResponse } from 'next/server'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { buildParticipantsExport } from '@/engine/domain/participants-export'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const db = await getDb()
  const today = getIsraelDateString(new Date())
  const [participants, todaysTriggers] = await Promise.all([db.getAllParticipants(), db.getDailyTriggersForDate(today)])

  return NextResponse.json({ participants: buildParticipantsExport(participants, todaysTriggers) })
}

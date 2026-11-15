// Endpoint למשיכת כל הנרשמים (שם/טלפון/סטטוס/יום1/מנחה מוצמדת) + סטטוס טריגר-הבוקר
// של היום (נשלח? נלחץ?) — למערכת חיצונית (Make.com) שצריכה גם את מי שלא לחץ היום.
// SECURITY: חשוף לאינטרנט, מוגן בסוד משותף ב-Authorization header (אותו סוד ש-Make.com
// כבר משתמש בו ל-webhook לחיצת הכפתור) — לא רק CORS/רשת. מחזיר PII (שם מלא + טלפון) —
// לעולם לא בלי הבדיקה הזו.
import { NextResponse } from 'next/server'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'
import { getCandidateLocalDates } from '@/engine/domain/scheduling'
import { buildParticipantsExport } from '@/engine/domain/participants-export'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.MAKE_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }

  const db = await getDb()
  const now = new Date()
  // "היום" הוא פר-משתתפת (לפי timezone) — שולפים את שלושת התאריכים הסמוכים, והייצוא בוחר לכל אחת את שלה.
  const [participants, nearbyTriggers] = await Promise.all([
    db.getAllParticipants(),
    Promise.all(getCandidateLocalDates(now).map((d) => db.getDailyTriggersForDate(d))).then((r) => r.flat()),
  ])

  return NextResponse.json({ participants: buildParticipantsExport(participants, nearbyTriggers, now) })
}

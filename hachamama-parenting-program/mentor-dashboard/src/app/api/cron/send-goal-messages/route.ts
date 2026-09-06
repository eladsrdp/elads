// לא ב-Vercel Cron (ראו vercel.json — רק generate-daily רשום שם בכוונה) — מופעל
// ע"י cron-job.org פעם ביום ב-14:00 שעון ישראל, כמו send-triggers/drip. GET+POST
// נתמכים שניהם למקרה שהמשתמש יעדיף Vercel Cron בעתיד.
import { NextResponse } from 'next/server'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { sendGoalMessages } from '@/engine/jobs/send-goal-messages'
import { getDb, getMakeClient } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await sendGoalMessages(db, getMakeClient(), getIsraelDateString(new Date()))
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle

// Endpoint שמופעל ע"י scheduler חיצוני (Vercel Cron). ראו server/README.md
// "מגבלות ידועות" למה שלושת ה-endpoints של cron חולקים סוד אחד (CRON_SECRET), בכוונה.
import { NextResponse } from 'next/server'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { generateDailyDeliveries } from '@/engine/jobs/generate-daily'
import { getDb } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await generateDailyDeliveries(db, getIsraelDateString(new Date()), engineEnv.PROGRAM_LENGTH_DAYS)
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle

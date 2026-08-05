// GET+POST: Vercel's native Cron feature always calls via GET (and auto-attaches
// Authorization: Bearer $CRON_SECRET using the project's own env var of that name —
// no extra config needed there). POST stays supported for external services
// (cron-job.org) and manual curl testing.
import { NextResponse } from 'next/server'
import { getIsraelDateString } from '@/engine/domain/scheduling'
import { sendMorningTriggers } from '@/engine/jobs/send-triggers'
import { getDb, getMakeClient } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await sendMorningTriggers(db, getMakeClient(), getIsraelDateString(new Date()))
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle

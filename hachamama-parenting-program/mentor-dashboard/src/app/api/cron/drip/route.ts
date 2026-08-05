// ריצה בתדירות גבוהה (כל כמה דקות) — ראו server/README.md למגבלת Vercel Hobby cron
// (פעם ביום בלבד) שבגללה זה נשאר על cron-job.org חיצוני, לא Vercel-native.
import { NextResponse } from 'next/server'
import { runDrip } from '@/engine/jobs/drip'
import { getDb, getMakeClient } from '@/engine/app-context'
import { engineEnv } from '@/engine/env'

async function handle(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${engineEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: 'לא מורשה' }, { status: 401 })
  }
  const db = await getDb()
  const result = await runDrip(db, getMakeClient(), new Date().toISOString())
  return NextResponse.json(result)
}

export const GET = handle
export const POST = handle

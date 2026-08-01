// Entrypoint לפריסה ב-Vercel (serverless function) — חלופה ל-src/index.ts
// (שמשמש להרצה כשרת Node רגיל, לפיתוח מקומי או hosting מסוג Railway/Render).
// vercel.json מפנה כל בקשה לכאן; ה-routing בפועל נעשה ע"י ה-Hono app עצמו.
//
// הערה: Vercel Hobby (חינמי) מגביל Cron מובנה לפעם ביום — לא מתאים ל-drip
// שרץ כל כמה דקות. לתזמון בפועל השתמשו בשירות cron חיצוני וחינמי
// (למשל cron-job.org או GitHub Actions scheduled workflow) שקורא ל-3 ה-endpoints
// תחת /api/cron/* עם ה-CRON_SECRET, במקום Cron המובנה של Vercel. ראו README.
import { handle } from 'hono/vercel'
import { createApp } from '../src/app.js'
import { env } from '../src/env.js'
import { createMakeClient } from '../src/make/client.js'
import { createDb } from '../src/repository/db.js'

export const config = { runtime: 'nodejs' }

const db = await createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const makeClient = createMakeClient(env.MAKE_WEBHOOK_URL ?? '')
const app = createApp({ db, makeClient, env })

export default handle(app)

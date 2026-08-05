// קונפיגורציית סביבה של המנוע — כל אלה secrets/service-role, בכוונה בלי תחילית
// NEXT_PUBLIC_, כדי שלעולם לא יגיעו ל-bundle של הדפדפן. נקרא רק מ-Route Handlers/
// Server Actions (קוד server-only ב-Next.js) — לעולם לא מקובץ 'use client'.
// הועבר כמעט-מילה-במילה מ-hachamama-parenting-program/server/src/env.ts, בלי
// PORT (Next.js מנהל את זה בעצמו) ובלי 'dotenv/config' (Next.js טוען .env.local לבד).
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  MAKE_WEBHOOK_URL: z.string().optional(),
  SIGNUP_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  MAKE_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  CRON_SECRET: z.string().default('dev-secret-change-me'),
  PROGRAM_LENGTH_DAYS: z.coerce.number().default(64 * 7),
})

export type EngineEnv = z.infer<typeof schema>

export const engineEnv: EngineEnv = schema.parse(process.env)
export const isProd = engineEnv.NODE_ENV === 'production'

// SECURITY: בלי הבדיקה הזו אפשר לפרוס לפרודקשן עם secrets ברירת-מחדל ידועים מראש.
const insecureDefaults = [engineEnv.SIGNUP_WEBHOOK_SECRET, engineEnv.MAKE_WEBHOOK_SECRET, engineEnv.CRON_SECRET]
if (isProd && insecureDefaults.includes('dev-secret-change-me')) {
  throw new Error(
    'SIGNUP_WEBHOOK_SECRET / MAKE_WEBHOOK_SECRET / CRON_SECRET חייבים ערך אקראי ייעודי בפרודקשן',
  )
}

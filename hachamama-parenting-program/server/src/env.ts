// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8788),
  NODE_ENV: z.string().default('development'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  MAKE_WEBHOOK_URL: z.string().optional(),
  SIGNUP_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  MAKE_WEBHOOK_SECRET: z.string().default('dev-secret-change-me'),
  CRON_SECRET: z.string().default('dev-secret-change-me'),
})

export type Env = z.infer<typeof schema>

export const env: Env = schema.parse(process.env)
export const isProd = env.NODE_ENV === 'production'

// SECURITY: בלי הבדיקה הזו אפשר לפרוס לפרודקשן עם secrets ברירת-מחדל ידועים מראש.
const insecureDefaults = [env.SIGNUP_WEBHOOK_SECRET, env.MAKE_WEBHOOK_SECRET, env.CRON_SECRET]
if (isProd && insecureDefaults.includes('dev-secret-change-me')) {
  throw new Error(
    'SIGNUP_WEBHOOK_SECRET / MAKE_WEBHOOK_SECRET / CRON_SECRET חייבים ערך אקראי ייעודי בפרודקשן',
  )
}

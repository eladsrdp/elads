// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.string().default('development'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  WEBHOOK_SECRET: z.string().default('dev-webhook-secret-change-me'),
  // Neon (Postgres serverless) — מחרוזת חיבור אחת. עדיפות ראשונה אם קיימת (ראו db.ts).
  DATABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
})

export type Env = z.infer<typeof schema>

const nodeEnv = process.env.NODE_ENV ?? 'development'
const portSource =
  nodeEnv === 'production' ? (process.env.PORT ?? process.env.SERVER_PORT) : process.env.SERVER_PORT

export const env: Env = schema.parse({ ...process.env, PORT: portSource })
export const isProd = env.NODE_ENV === 'production'

if (isProd && (env.JWT_SECRET === 'dev-secret-change-me' || env.WEBHOOK_SECRET === 'dev-webhook-secret-change-me')) {
  throw new Error('JWT_SECRET ו-WEBHOOK_SECRET חייבים להיות ערכים אקראיים בפרודקשן')
}

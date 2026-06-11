// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  NODE_ENV: z.string().default('development'),
  SESSION_SECRET: z.string().default('dev-secret-change-me'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  EMAIL_MODE: z.enum(['console', 'resend']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  OTP_FROM_EMAIL: z.string().default('Priority Lite <onboarding@resend.dev>'),
  PRIORITY_MODE: z.enum(['mock', 'real']).default('mock'),
  PRIORITY_BASE_URL: z.string().optional(),
  PRIORITY_TABULA_INI: z.string().default('tabula.ini'),
  PRIORITY_COMPANY: z.string().optional(),
  PRIORITY_USER: z.string().optional(),
  PRIORITY_PASSWORD: z.string().optional(),
  MOCK_FAIL_RATE: z.coerce.number().min(0).max(1).default(0),
})

export type Env = z.infer<typeof schema>

// בפיתוח PORT שייך לכלים אחרים (Vite / preview מזריקים אותו) — השרת מקשיב
// ל-SERVER_PORT אם הוגדר, אחרת 8787. בפרודקשן (Railway) PORT הוא הסטנדרט.
const nodeEnv = process.env.NODE_ENV ?? 'development'
const portSource =
  nodeEnv === 'production'
    ? (process.env.PORT ?? process.env.SERVER_PORT)
    : process.env.SERVER_PORT

export const env: Env = schema.parse({ ...process.env, PORT: portSource })
export const isProd = env.NODE_ENV === 'production'

if (isProd && env.SESSION_SECRET === 'dev-secret-change-me') {
  throw new Error('SESSION_SECRET חייב להיות ערך אקראי בפרודקשן')
}

// inbox/src/env.ts
// קונפיגורציית סביבה — נטענת פעם אחת ומאומתת עם zod.
import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  SELF_CHAT_ID: z.string(),
  DB_PATH: z.string().default('./data/inbox.db'),
})

export type Env = z.infer<typeof schema>
export const env: Env = schema.parse(process.env)

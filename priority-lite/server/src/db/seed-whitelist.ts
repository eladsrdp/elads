// CLI לטעינת whitelist עובדים מקובץ JSON:
//   npm run seed                  ← קורא ./whitelist.json
//   npm run seed -- אחר.json      ← קובץ אחר
// פורמט: ראה whitelist.example.json
import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { normalizePhone } from '../auth/otp'
import { createDb } from './db'
import { env } from '../env'

const rowSchema = z.object({
  phone: z.string(),
  email: z.string().email(),
  priorityEmpId: z.string(),
  name: z.string().min(1),
  active: z.boolean().optional(),
})

const file = process.argv[2] ?? './whitelist.json'
const raw = JSON.parse(readFileSync(file, 'utf8'))
const rows = z.array(rowSchema).parse(raw)

const db = createDb(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
const target = env.SUPABASE_URL ? 'Supabase' : 'local (in-memory)'
let count = 0
for (const row of rows) {
  const phone = normalizePhone(row.phone)
  if (!phone) {
    console.error(`⚠️ דילוג: טלפון לא תקין "${row.phone}" (${row.name})`)
    continue
  }
  await db.upsertEmployee({ ...row, phone })
  count++
  console.log(`✓ ${row.name} — ${phone} → עובד ${row.priorityEmpId}`)
}
console.log(`\nנטענו ${count} עובדים ל-${target}`)

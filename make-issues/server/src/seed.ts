// זורע חשבונות משתמש קבועים (3-4 עמיתים) מתוך accounts.json מקומי (לא ב-git).
// אם יש credentials ל-Supabase — זורע לשם; אחרת זורע ל-DB המקומי מבוסס-הקובץ
// (אותו קובץ ש-createDb/index.ts משתמשים בו, כדי שהזריעה תשפיע על השרת בפועל).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from './auth/password'
import { env } from './env'
import { LOCAL_DB_PATH } from './db/db'
import { createLocalDb } from './db/local-impl'

interface SeedAccount {
  username: string
  password: string
}

async function seedSupabase(accounts: SeedAccount[]) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    const { error } = await client
      .from('users')
      .upsert({ username: account.username, password_hash: passwordHash }, { onConflict: 'username' })
    if (error) throw new Error(`seed failed for ${account.username}: ${error.message}`)
    console.log(`✓ ${account.username}`)
  }
}

async function seedLocal(accounts: SeedAccount[]) {
  const db = createLocalDb(LOCAL_DB_PATH)
  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    await db.upsertUser(account.username, passwordHash)
    console.log(`✓ ${account.username} (local DB: ${LOCAL_DB_PATH})`)
  }
}

async function main() {
  const accounts = JSON.parse(readFileSync('./accounts.json', 'utf-8')) as SeedAccount[]

  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    await seedSupabase(accounts)
  } else {
    await seedLocal(accounts)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

// זורע חשבונות משתמש קבועים (3-4 עמיתים) מתוך accounts.json מקומי (לא ב-git).
// עדיפות: Neon (DATABASE_URL) > Supabase (credentials) > DB מקומי מבוסס-קובץ
// (אותו קובץ ש-createDb/index.ts משתמשים בו, כדי שהזריעה תשפיע על השרת בפועל).
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from './auth/password'
import { env } from './env'
import { LOCAL_DB_PATH } from './db/db'
import { createLocalDb } from './db/local-impl'

interface SeedAccount {
  username: string
  password: string
}

async function seedNeon(accounts: SeedAccount[]) {
  const sql = neon(env.DATABASE_URL!)
  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    await sql`
      insert into users (username, password_hash) values (${account.username}, ${passwordHash})
      on conflict (username) do update set password_hash = excluded.password_hash
    `
    console.log(`✓ ${account.username} (Neon)`)
  }
}

async function seedSupabase(accounts: SeedAccount[]) {
  const client = createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    const { error } = await client
      .from('users')
      .upsert({ username: account.username, password_hash: passwordHash }, { onConflict: 'username' })
    if (error) throw new Error(`seed failed for ${account.username}: ${error.message}`)
    console.log(`✓ ${account.username} (Supabase)`)
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

  if (env.DATABASE_URL) {
    await seedNeon(accounts)
  } else if (env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
    await seedSupabase(accounts)
  } else {
    await seedLocal(accounts)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

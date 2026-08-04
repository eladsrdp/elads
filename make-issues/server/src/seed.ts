// זורע חשבונות משתמש קבועים (3-4 עמיתים) מתוך accounts.json מקומי (לא ב-git).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from './auth/password'
import { env } from './env'

interface SeedAccount {
  username: string
  password: string
}

async function main() {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL ו-SUPABASE_SERVICE_KEY נדרשים לזריעת משתמשים')
  }
  const accounts = JSON.parse(readFileSync('./accounts.json', 'utf-8')) as SeedAccount[]
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password)
    const { error } = await client
      .from('users')
      .upsert({ username: account.username, password_hash: passwordHash }, { onConflict: 'username' })
    if (error) throw new Error(`seed failed for ${account.username}: ${error.message}`)
    console.log(`✓ ${account.username}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

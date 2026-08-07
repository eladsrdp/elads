// hachamama-parenting-program/mentor-dashboard/src/app/mentors/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { engineEnv } from '@/engine/env'

export async function createMentor(formData: FormData) {
  const fullName = formData.get('fullName')
  const email = formData.get('email')
  const phone = formData.get('phone')
  if (typeof fullName !== 'string' || typeof email !== 'string' || typeof phone !== 'string' || !fullName || !email || !phone) {
    redirect('/mentors/new?error=missing-fields')
  }
  if (!engineEnv.SUPABASE_URL || !engineEnv.SUPABASE_SERVICE_KEY) {
    redirect('/mentors/new?error=server-misconfigured')
  }

  // SECURITY: service role key — קוד server-only (Server Action), לעולם לא נחשף ללקוח.
  const admin = createClient(engineEnv.SUPABASE_URL, engineEnv.SUPABASE_SERVICE_KEY)

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: phone,
    email_confirm: true,
  })
  if (createError || !created.user) {
    const code = createError?.message.includes('already been registered') ? 'email-exists' : 'create-failed'
    redirect(`/mentors/new?error=${code}`)
  }

  const { error: insertError } = await admin.from('mentors').insert({
    user_id: created.user.id,
    full_name: fullName,
    phone,
  })
  if (insertError) {
    // לא משאירים משתמש Auth יתום אם שורת ה-mentors נכשלה.
    await admin.auth.admin.deleteUser(created.user.id)
    redirect('/mentors/new?error=create-failed')
  }

  redirect('/mentors/new?success=1')
}

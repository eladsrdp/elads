// hachamama-parenting-program/mentor-dashboard/src/app/reset-password/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password')
  if (typeof password !== 'string' || password.length < 6) {
    redirect('/reset-password?error=too-short')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    redirect('/reset-password?error=update-failed')
  }

  redirect('/participants')
}

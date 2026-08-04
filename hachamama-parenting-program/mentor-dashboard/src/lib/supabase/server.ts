// hachamama-parenting-program/mentor-dashboard/src/lib/supabase/server.ts
// Supabase client לשימוש ב-Server Components/Actions — קורא/כותב cookies של הבקשה
// הנוכחית כדי לשמור סשן. אנון key בלבד — הרשאות אמיתיות מגיעות מ-RLS (ראו migration 0002).
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // נקרא מתוך Server Component בלי אפשרות לכתוב cookies — מתעלמים בכוונה,
          // ה-middleware כבר מרפרש את הסשן בכל בקשה (ראו תיעוד @supabase/ssr).
        }
      },
    },
  })
}

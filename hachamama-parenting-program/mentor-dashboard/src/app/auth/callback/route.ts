// hachamama-parenting-program/mentor-dashboard/src/app/auth/callback/route.ts
// נקודת נחיתה לקישורי Supabase Auth (איפוס סיסמה, אישור מייל וכו') — מחליף את
// ה-PKCE code שבקישור בסשן אמיתי (cookies), ואז מפנה להשלמת הפעולה (איפוס סיסמה).
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }
  return NextResponse.redirect(new URL('/reset-password', request.url))
}

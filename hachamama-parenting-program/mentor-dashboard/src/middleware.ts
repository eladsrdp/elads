// hachamama-parenting-program/mentor-dashboard/src/middleware.ts
// SECURITY: זו שכבת ההגנה הראשונה (UX-level redirect) — לא שכבת האבטחה האמיתית.
// ההגנה האמיתית היא RLS (migration 0002_mentor_rls.sql): גם אם מישהו יעקוף את
// ה-middleware, שאילתות ל-Supabase בלי סשן מנחה תקין יחזירו 0 שורות.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = request.nextUrl.pathname === '/login'
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/participants', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

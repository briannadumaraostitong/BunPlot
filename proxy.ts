import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthOutage } from '@/lib/supabase/authOutage'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // getUser() may have refreshed or cleared the session cookies via setAll
  // above, which writes them onto supabaseResponse. A redirect is a brand-new
  // response with an empty cookie jar, so those writes have to be copied
  // across or the browser keeps the stale session — the documented pitfall in
  // Supabase's SSR middleware guide.
  function redirectTo(url: URL) {
    const response = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/projects')

  // Only a missing or rejected session means signed out. On an outage, let the
  // request through so the page's own error handling shows.
  if (isProtected && !user && !isAuthOutage(error)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return redirectTo(url)
  }

  // The landing page and the auth pages are for signed-out visitors.
  const isSignedOutPage = ['/', '/login', '/signup'].includes(request.nextUrl.pathname)
  if (isSignedOutPage && user) {
    return redirectTo(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // icon and apple-icon are the generated app icons (app/icon.tsx and
    // app/apple-icon.tsx): images with no file extension, so named here.
    '/((?!_next/static|_next/image|favicon.ico|icon$|apple-icon$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
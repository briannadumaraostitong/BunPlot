import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthOutage } from '@/lib/supabase/authOutage'
import { THEME_COOKIE } from '@/lib/themes'
import { lookFromCookie, type Look } from '@/lib/looks'

// The signed-out pages shown in the look of the visitor's saved theme, each
// rewritten to its prebuilt copy for that look: the landing page to
// /landing/<look> (app/landing/), login, signup, the password pages and the
// email-link page to /look/<look>/login and so on (app/(auth)/look/[look]/).
// /confirm, /forgot-password and /reset-password stay open to signed-in
// visitors too: confirming a new email address happens while signed in,
// someone who has forgotten their password can't change it from Settings,
// and a reset link signs its reader in before /reset-password.
const LOOK_PAGES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/confirm']
const LOOK_PREFIXES = ['/landing/', '/look/']
function lookPath(pathname: string, look: Look) {
  return pathname === '/' ? `/landing/${look}` : `/look/${look}${pathname}`
}

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

  // The prebuilt copies are only reached by the rewrite below; a request for
  // one directly goes to its own address instead.
  if (LOOK_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix))) {
    const page = '/' + request.nextUrl.pathname.split('/').slice(3).join('/')
    const url = request.nextUrl.clone()
    url.pathname = LOOK_PAGES.includes(page) ? page : '/'
    return redirectTo(url)
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

  // Signed out: the look of the visitor's saved theme. The cookie is
  // untrusted, so lookFromCookie() only ever returns one of the known looks
  // (anything else is Classic following the device), and only that goes into
  // the path. The address stays as it was, query string included.
  if (LOOK_PAGES.includes(request.nextUrl.pathname)) {
    const look = lookFromCookie(request.cookies.get(THEME_COOKIE)?.value)
    const url = request.nextUrl.clone()
    url.pathname = lookPath(request.nextUrl.pathname, look)
    const response = NextResponse.rewrite(url, { request })
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
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
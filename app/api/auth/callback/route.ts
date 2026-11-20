import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { safeRedirectPath } from '@/lib/safeRedirect'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only a path on this site: "@evil.com" after the origin would make
  // evil.com the host (lib/safeRedirect.ts).
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
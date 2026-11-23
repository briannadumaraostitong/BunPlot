import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/safeRedirect'
import { EMAIL_LINKS, emailLinkType, type EmailLinkError } from '@/lib/emailLinks'

// The Continue button on /confirm (lib/emailLinks.ts) posts here: verify the
// email's token, which signs the visitor in (the session cookies are set on
// this response), then go on to the link's next page. 303, so the browser
// follows with a GET.
export async function POST(request: Request) {
  const { origin } = new URL(request.url)

  // Only the form on our own page: otherwise another site could post its own
  // token here and sign a visitor into the wrong account.
  if (request.headers.get('origin') !== origin) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const form = await request.formData()
  const tokenHash = form.get('token_hash')
  const type = emailLinkType(typeof form.get('type') === 'string' ? (form.get('type') as string) : null)

  const back = (error: EmailLinkError) => {
    const url = new URL('/confirm', origin)
    url.searchParams.set('error', error)
    if (type) url.searchParams.set('type', type)
    return NextResponse.redirect(url, 303)
  }

  if (!type || typeof tokenHash !== 'string' || tokenHash.length === 0) return back('invalid')

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    console.error('Email link verification error:', error.message)
    return back('expired')
  }

  // Only a path on this site (lib/safeRedirect.ts).
  const next = form.get('next')
  const target = safeRedirectPath(typeof next === 'string' ? next : null, EMAIL_LINKS[type].next)
  return NextResponse.redirect(new URL(target, origin), 303)
}

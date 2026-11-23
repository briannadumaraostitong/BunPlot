'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AuthShell, useAuthLook } from '@/components/auth/AuthShell'
import { EMAIL_LINKS, EMAIL_LINK_ERRORS, emailLinkType, type EmailLinkError } from '@/lib/emailLinks'

// Where an email's link lands (lib/emailLinks.ts): what the link is for and
// a Continue button, which posts the token to /api/auth/confirm. Opening the
// link verifies nothing, so a scanner opening it first doesn't use it up.
// After a failed verification the route sends the visitor back here with
// ?error=.

function useLink() {
  const params = useSearchParams()
  const type = emailLinkType(params.get('type'))
  const tokenHash = params.get('token_hash')
  const errorParam = params.get('error')
  const error: EmailLinkError | null =
    errorParam === 'expired' || errorParam === 'invalid'
      ? errorParam
      : !type || !tokenHash
        ? 'invalid'
        : null
  return { type, tokenHash, next: params.get('next'), error }
}

function ConfirmForm() {
  const look = useAuthLook()
  const { type, tokenHash, next, error } = useLink()

  if (error || !type || !tokenHash) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm text-destructive">
          {EMAIL_LINK_ERRORS[error ?? 'invalid']}
        </p>
        <Button asChild className={`w-full ${look.submit} ${look.button}`}>
          <Link href="/login">Back to log in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form method="post" action="/api/auth/confirm" className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      {next && <input type="hidden" name="next" value={next} />}
      <p className="text-sm text-muted-foreground">{EMAIL_LINKS[type].text}</p>
      <Button type="submit" className={`w-full ${look.submit} ${look.button}`}>
        Continue
      </Button>
    </form>
  )
}

function ConfirmShell() {
  const { type, error } = useLink()
  const copy = type ? EMAIL_LINKS[type] : null
  return (
    <AuthShell
      eyebrow={copy?.eyebrow ?? 'Email link'}
      title={error ? 'This link can’t be used' : (copy?.title ?? 'Email link')}
      panelTitle={!error && copy ? copy.panelTitle : 'EMAIL LINK'}
    >
      <ConfirmForm />
    </AuthShell>
  )
}

export default function ConfirmPage() {
  // useSearchParams needs a Suspense boundary, or the App Router fails the
  // build (the pages are prebuilt per look).
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <ConfirmShell />
    </Suspense>
  )
}

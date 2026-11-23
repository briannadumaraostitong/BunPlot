'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell, AUTH_LABEL, useAuthLook } from '@/components/auth/AuthShell'
import { emailLinkReturn } from '@/lib/emailLinks'

// Asks Supabase to email a password reset link (supabase/email-templates/
// reset-password.html), which opens /confirm and then /reset-password. The
// reply is the same whether or not the address has an account, so the page
// can't be used to find out who does. Open to signed-in visitors too: someone
// who has forgotten their password can't change it from Settings, which asks
// for the current one.

// Supabase sends at most one email a minute to an address; the button waits
// as long before it can send again.
const RESEND_WAIT_SECONDS = 60

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const look = useAuthLook()

  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const timer = setTimeout(() => setWait((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [wait])

  async function send(address: string) {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: emailLinkReturn(location.origin),
    })
    setLoading(false)
    if (error) {
      // Supabase's own limit (another request for this address too soon, or
      // too many emails overall): the one error worth telling apart.
      setError(
        error.status === 429
          ? 'Too many requests. Wait a minute, then try again.'
          : "Couldn't send the email. Try again in a minute."
      )
      return
    }
    setSentTo(address)
    setWait(RESEND_WAIT_SECONDS)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(email.trim())
  }

  const backToLogin = (
    <>
      Remembered it?{' '}
      <Link href="/login" className={look.link}>
        Log in
      </Link>
    </>
  )

  if (sentTo) {
    return (
      <AuthShell eyebrow="Forgot your password" title="Check your email" panelTitle="RESET PASSWORD" footer={backToLogin}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If there&apos;s a BunPlot account for <strong className="text-foreground">{sentTo}</strong>, we&apos;ve sent it a
            link to reset the password. The link works once and expires in an hour. If it hasn&apos;t arrived in a few
            minutes, check your spam folder.
          </p>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            className={`w-full ${look.button}`}
            disabled={loading || wait > 0}
            onClick={() => void send(sentTo)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : wait > 0 ? `Send again in ${wait}s` : 'Send again'}
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Forgot your password" title="Reset your password" panelTitle="RESET PASSWORD" footer={backToLogin}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enter the email you use for BunPlot and we&apos;ll send you a link to choose a new password.
        </p>
        <div className="space-y-2">
          <Label htmlFor="email" data-slot="field-label" className={AUTH_LABEL}>
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="bg-background dark:bg-background"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className={`w-full ${look.submit} ${look.button}`} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  )
}

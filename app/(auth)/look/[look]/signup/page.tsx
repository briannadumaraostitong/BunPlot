'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { AuthShell, AUTH_LABEL, useAuthLook, useAuthTurnstileTheme } from '@/components/auth/AuthShell'
import { isCaptchaError, TURNSTILE_FAILED, TURNSTILE_WAITING, useTurnstile } from '@/components/auth/Turnstile'
import { emailLinkReturn } from '@/lib/emailLinks'
import { PASSWORD_HINT, passwordProblem } from '@/lib/passwords'

export default function SignupPage() {
  const supabase = createClient()
  const look = useAuthLook()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const turnstile = useTurnstile({ theme: useAuthTurnstileTheme(), action: 'signup' })

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    const problem = passwordProblem(password)
    if (problem) {
      setError(problem)
      return
    }
    if (!turnstile.ready) {
      setError(TURNSTILE_WAITING)
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        // The confirmation email's link is built on this (lib/emailLinks.ts).
        emailRedirectTo: emailLinkReturn(location.origin),
        captchaToken: turnstile.token,
      },
    })
    // A token works once: get a fresh one for the next attempt.
    turnstile.reset()

    if (error) {
      setError(isCaptchaError(error) ? TURNSTILE_FAILED : error.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
  }

  if (done) {
    return (
      <AuthShell eyebrow="Almost there" title="Check your email" panelTitle="CONFIRM EMAIL">
        <div className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-accent-2" />
          <p className="text-sm text-(--hud-text-body)">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            Click the link to activate your account.
          </p>
          {/* One element: a link styled as the button (asChild), not a
              button inside a link. */}
          <Button asChild variant="outline" className={`mt-2 w-full ${look.button}`}>
            <Link href="/login">Back to log in</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Ready when you are"
      eyebrowTone="pink"
      title="Create your free account"
      panelTitle="NEW ACCOUNT"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className={look.link}>
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" data-slot="field-label" className={AUTH_LABEL}>
            Display Name
          </Label>
          <Input
            id="name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="bg-background dark:bg-background"
          />
        </div>

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
            className="bg-background dark:bg-background"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" data-slot="field-label" className={AUTH_LABEL}>
            Password
          </Label>
          <PasswordInput
            id="password"
            placeholder={PASSWORD_HINT}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="bg-background dark:bg-background"
          />
        </div>

        {turnstile.widget}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <Button
          type="submit"
          className={`w-full ${look.submit} ${look.button}`}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
        </Button>
      </form>
    </AuthShell>
  )
}

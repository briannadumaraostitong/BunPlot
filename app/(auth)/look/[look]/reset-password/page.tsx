'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { AuthShell, AUTH_LABEL, useAuthLook } from '@/components/auth/AuthShell'
import { PASSWORD_HINT, isRecentEmailLinkSession, passwordErrorMessage, passwordProblem } from '@/lib/passwords'

// Where a reset email's link ends up, after /confirm has signed the reader in
// (lib/emailLinks.ts): choose a new password. Only for a session that came
// from an emailed link in the last hour (lib/passwords.ts); anyone else is
// asked to request a link, so this page isn't a way round Settings' check of
// the current password. Saving signs out every other device, then says so
// here: going on to the app is a full page load from this rewritten page, so
// a toast wouldn't survive it.

type State = 'checking' | 'ready' | 'no-link' | 'done'

export default function ResetPasswordPage() {
  // One client for the page, so the session check below runs once.
  const [supabase] = useState(() => createClient())
  const look = useAuthLook()

  const [state, setState] = useState<State>('checking')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    // getClaims verifies the session's token, unlike getSession.
    supabase.auth.getClaims().then(({ data }) => {
      if (cancelled) return
      const claims = data?.claims
      setState(claims && isRecentEmailLinkSession(claims.amr, claims.iat) ? 'ready' : 'no-link')
    })
    return () => {
      cancelled = true
    }
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = passwordProblem(password, confirmation)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(passwordErrorMessage(error))
      setSaving(false)
      return
    }
    // Anyone still signed in elsewhere with the old password is signed out.
    // Best effort: the password is already changed if this fails.
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
    if (signOutError) console.error('Sign out of other devices failed:', signOutError.message)
    setState('done')
  }

  if (state === 'done') {
    return (
      <AuthShell eyebrow="All set" title="Password updated" panelTitle="RESET PASSWORD">
        <div className="space-y-4">
          <p role="status" className="text-sm text-muted-foreground">
            Your new password is saved, and you&apos;ve been signed out on every other device.
          </p>
          <Button asChild className={`w-full ${look.submit} ${look.button}`}>
            <Link href="/dashboard">Open your workspace</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  if (state === 'checking') {
    return (
      <AuthShell eyebrow="Forgot your password" title="Choose a new password" panelTitle="RESET PASSWORD">
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Checking your link" />
        </div>
      </AuthShell>
    )
  }

  if (state === 'no-link') {
    return (
      <AuthShell
        eyebrow="Forgot your password"
        title="Open the link from your email"
        panelTitle="RESET PASSWORD"
        footer={
          <>
            Remembered it?{' '}
            <Link href="/login" className={look.link}>
              Log in
            </Link>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To choose a new password, follow the link in your reset email. Each link works for an hour. Signed in
            already? Change your password from Settings.
          </p>
          <Button asChild className={`w-full ${look.submit} ${look.button}`}>
            <Link href="/forgot-password">Request a reset link</Link>
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell eyebrow="Forgot your password" title="Choose a new password" panelTitle="RESET PASSWORD">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" data-slot="field-label" className={AUTH_LABEL}>
            New password
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
        <div className="space-y-2">
          <Label htmlFor="confirmation" data-slot="field-label" className={AUTH_LABEL}>
            Confirm new password
          </Label>
          <PasswordInput
            id="confirmation"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            required
            autoComplete="new-password"
            className="bg-background dark:bg-background"
          />
        </div>
        <p className="text-xs text-muted-foreground">Saving signs you out on every other device.</p>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" className={`w-full ${look.submit} ${look.button}`} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save new password'}
        </Button>
      </form>
    </AuthShell>
  )
}

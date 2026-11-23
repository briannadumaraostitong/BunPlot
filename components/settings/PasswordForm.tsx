'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { checkCurrentPassword } from '@/lib/supabase/checkPassword'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PASSWORD_HINT, passwordErrorMessage, passwordProblem } from '@/lib/passwords'
import { TURNSTILE_FAILED, useTurnstile } from '@/components/auth/Turnstile'

// Change password in Settings: the current password is checked first, by a
// separate sign-in that leaves this session alone (lib/supabase/
// checkPassword.ts), then the new one is saved and, by default, every other
// device is signed out. Forgotten passwords go through /forgot-password.

const LABEL = 'text-[10px] font-semibold uppercase tracking-wider text-muted-foreground'

const CHECK_MESSAGES = {
  wrong: "That isn't your current password.",
  limited: 'Too many attempts. Wait a few minutes, then try again.',
  captcha: TURNSTILE_FAILED,
  failed: "Couldn't check your current password. Try again.",
} as const

export function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [signOutOthers, setSignOutOthers] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  // What the last save did, until the fields are edited again.
  const [saved, setSaved] = useState<string | null>(null)
  // The current-password check is a password sign-in, which Supabase's
  // CAPTCHA covers.
  const turnstile = useTurnstile({ theme: 'page', action: 'password_check' })

  const edit = (set: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    set(e.target.value)
    setSaved(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const problem = !current ? 'Enter your current password.' : passwordProblem(next, confirmation)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    setError(null)
    setSaved(null)

    // Waits for the browser check if its token hasn't arrived yet.
    const captcha = await turnstile.getToken()
    if ('error' in captcha) {
      setError(captcha.error)
      setSaving(false)
      return
    }

    const check = await checkCurrentPassword(email, current, captcha.token)
    // A token works once: get a fresh one for the next attempt.
    turnstile.reset()
    if (check !== 'ok') {
      setError(CHECK_MESSAGES[check])
      setSaving(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: next })
    if (error) {
      setError(passwordErrorMessage(error))
      setSaving(false)
      return
    }
    let signedOut = false
    if (signOutOthers) {
      // Best effort: the password is already changed if this fails.
      const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' })
      if (signOutError) console.error('Sign out of other devices failed:', signOutError.message)
      signedOut = !signOutError
    }

    setCurrent('')
    setNext('')
    setConfirmation('')
    setSaving(false)
    setSaved(signedOut ? 'Password changed. Other devices are signed out.' : 'Password changed.')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-password" data-slot="field-label" className={LABEL}>
          Current password
        </Label>
        <div className="max-w-xs">
          <PasswordInput
            id="current-password"
            className="bg-background"
            value={current}
            onChange={edit(setCurrent)}
            autoComplete="current-password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password" data-slot="field-label" className={LABEL}>
          New password
        </Label>
        <div className="max-w-xs">
          <PasswordInput
            id="new-password"
            className="bg-background"
            placeholder={PASSWORD_HINT}
            value={next}
            onChange={edit(setNext)}
            autoComplete="new-password"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-password" data-slot="field-label" className={LABEL}>
          Confirm new password
        </Label>
        <div className="max-w-xs">
          <PasswordInput
            id="confirm-password"
            className="bg-background"
            value={confirmation}
            onChange={edit(setConfirmation)}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="sign-out-others" checked={signOutOthers} onCheckedChange={setSignOutOthers} />
        <Label htmlFor="sign-out-others" className="text-sm font-normal">
          Sign out on other devices
        </Label>
      </div>

      {turnstile.widget}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={saving || !current || !next || !confirmation}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Change password'}
        </Button>
        {saved && (
          <span role="status" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="h-3 w-3" />
            {saved}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Forgot your current password?{' '}
        <Link href="/forgot-password" className="text-link underline underline-offset-2 hover:text-foreground">
          Reset it by email
        </Link>
      </p>
    </form>
  )
}

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { AuthShell, AUTH_LABEL, useAuthLook, useAuthTurnstileTheme } from '@/components/auth/AuthShell'
import { isCaptchaError, TURNSTILE_FAILED, useTurnstile } from '@/components/auth/Turnstile'
import { useTheme } from '@/components/theme/ThemeProvider'
import { normalizeThemeSetting } from '@/lib/themes'
import { safeRedirectPath } from '@/lib/safeRedirect'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { adoptTheme } = useTheme()
  const look = useAuthLook()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const turnstile = useTurnstile({ theme: useAuthTurnstileTheme(), action: 'login' })

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Waits for the browser check if its token hasn't arrived yet.
    const captcha = await turnstile.getToken()
    if ('error' in captcha) {
      setError(captcha.error)
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha.token },
    })
    // A token works once: get a fresh one for the next attempt.
    turnstile.reset()

    if (error) {
      setError(isCaptchaError(error) ? TURNSTILE_FAILED : error.message)
      setLoading(false)
      return
    }

    // The profile's theme, applied before the app renders so it doesn't
    // first appear in this device's. Best effort: if the read fails, the app
    // applies it later (AppShell).
    const { data: row } = await supabase.from('profiles').select('theme').eq('id', data.user.id).single()
    if (row) adoptTheme(normalizeThemeSetting((row as { theme: unknown }).theme))

    // proxy.ts sets redirectTo when it bounces an unauthenticated request, so
    // signing in returns you where you were headed. Only a path on this site
    // (lib/safeRedirect.ts), or a crafted link could send you elsewhere.
    const target = safeRedirectPath(searchParams.get('redirectTo'))

    router.push(target)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
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

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <Label htmlFor="password" data-slot="field-label" className={AUTH_LABEL}>
            Password
          </Label>
          <Link href="/forgot-password" className={`text-xs ${look.link}`}>
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="bg-background dark:bg-background"
        />
      </div>

      {turnstile.widget}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className={`w-full ${look.submit} ${look.button}`} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log in'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  const look = useAuthLook()
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your workspace"
      panelTitle="LOG IN"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className={look.link}>
            Sign up
          </Link>
        </>
      }
    >
      {/* useSearchParams needs a Suspense boundary — without one the App
          Router fails the build rather than degrading at runtime. */}
      <Suspense fallback={<div className="h-44" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  )
}

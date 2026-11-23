import { createClient } from '@supabase/supabase-js'

// Checks an account's current password without touching the signed-in
// session: a throwaway Supabase client that keeps its session in memory
// only (no localStorage, no cookies, no token refresh) signs in with the
// password, then signs that one session out again. The app's own client and
// its cookies are never involved. Runs in the browser, so Supabase's limit on
// sign-in attempts counts the visitor's own address, not the server's.
// When Supabase's CAPTCHA is on, this sign-in needs a Turnstile token too
// (components/auth/Turnstile.tsx), as any password sign-in does.

export type PasswordCheck = 'ok' | 'wrong' | 'limited' | 'captcha' | 'failed'

// One for the page, made on first use: a second client on the same storage
// key makes supabase-js warn. It holds no session between checks, since each
// one signs out again.
let checker: ReturnType<typeof createClient> | null = null

function passwordChecker() {
  checker ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      // Its own name, so it never shares storage with the app's client.
      storageKey: 'bunplot-password-check',
    },
  })
  return checker
}

export async function checkCurrentPassword(
  email: string,
  password: string,
  captchaToken?: string
): Promise<PasswordCheck> {
  const client = passwordChecker()

  const { error } = await client.auth.signInWithPassword({ email, password, options: { captchaToken } })
  if (error) {
    if (error.status === 429) return 'limited'
    if (error.code === 'captcha_failed') return 'captcha'
    if (error.code === 'invalid_credentials') return 'wrong'
    console.error('Current password check failed:', error.message)
    return 'failed'
  }

  // Only this check's session: the default scope would end every session,
  // including the one the visitor is using.
  const { error: signOutError } = await client.auth.signOut({ scope: 'local' })
  if (signOutError) console.error('Password check sign-out failed:', signOutError.message)
  return 'ok'
}

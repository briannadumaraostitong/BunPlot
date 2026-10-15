import { redirect } from 'next/navigation'
import { isAuthOutage } from './authOutage'
import type { createClient } from './server'

// For server pages under the app shell: returns the signed-in user, sends a
// signed-out visitor to /login, and throws on an outage so the page's
// error.tsx shows instead of a login form that couldn't work either.
export async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (user) return user
  if (error && isAuthOutage(error)) throw new Error(`Couldn't verify your session: ${error.message}`)
  redirect('/login')
}

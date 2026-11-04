import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAuthOutage } from '@/lib/supabase/authOutage'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { normalizeThemeSetting } from '@/lib/themes'
import type { Profile } from '@/types/database'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // On an outage, render the shell without a profile and let each page show
  // its own error.tsx inside it. Throwing here would skip (app)/error.tsx,
  // since a layout's errors go to the boundary above it, and there isn't one.
  if (!user && !isAuthOutage(error)) redirect('/login')

  const { data } = user
    ? await supabase.from('profiles').select('*').eq('id', user.id).single()
    : { data: null }
  const profile = data as Profile | null

  // The profile's theme, applied before paint on a full load (a new device,
  // or one changed on another device). Without a profile (a failed fetch, an
  // auth outage) the device keeps its own.
  return (
    <>
      {profile && <ThemeScript setting={normalizeThemeSetting(profile.theme)} />}
      <AppShell profile={profile}>{children}</AppShell>
    </>
  )
}

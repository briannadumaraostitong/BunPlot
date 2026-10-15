import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/requireUser'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { SoundSettings } from '@/components/settings/SoundSettings'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import type { Metadata } from 'next'
import type { Profile } from '@/types/database'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // A failed load shows error.tsx; only a genuinely missing profile (PGRST116)
  // still goes to login.
  if (error && error.code !== 'PGRST116') throw new Error(`Couldn't load profile: ${error.message}`)
  const profile = data as Profile | null
  if (!profile) redirect('/login')

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <ProfileForm profile={profile} email={user.email ?? ''} />
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>

        <div className="flex items-center justify-between max-w-sm">
          <span className="text-sm font-medium">Theme</span>
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Sound</h2>
        <SoundSettings profile={profile} />
      </section>
    </div>
  )
}

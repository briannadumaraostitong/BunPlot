import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/requireUser'
import { ProfileForm } from '@/components/settings/ProfileForm'
import { SoundSettings } from '@/components/settings/SoundSettings'
import { PasswordForm } from '@/components/settings/PasswordForm'
import { ThemePicker } from '@/components/theme/ThemePicker'
import { AssetCredit } from '@/components/brand/AssetCredit'
import { normalizeThemeSetting } from '@/lib/themes'
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
        <h1 data-slot="page-title" className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <section className="rounded-xl corner-cut border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <ProfileForm profile={profile} email={user.email ?? ''} />
      </section>

      <section className="rounded-xl corner-cut border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Password</h2>
        <PasswordForm email={user.email ?? ''} />
      </section>

      <section className="rounded-xl corner-cut border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>

        {/* The profile's theme: what the server can render as selected. */}
        <ThemePicker savedTheme={normalizeThemeSetting(profile.theme)} />

        {/* Required by the frames' CC BY 4.0 license; see ASSETS.md. */}
        <AssetCredit className="text-xs leading-relaxed text-muted-foreground" />
      </section>

      <section className="rounded-xl corner-cut border border-border bg-card p-4 space-y-4">
        <h2 className="text-lg font-semibold">Sound</h2>
        <SoundSettings profile={profile} />
      </section>
    </div>
  )
}

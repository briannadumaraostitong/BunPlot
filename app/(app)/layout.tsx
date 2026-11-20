import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAuthOutage } from '@/lib/supabase/authOutage'
import { AppShell } from '@/components/layout/AppShell'
import { ThemeScript } from '@/components/theme/ThemeScript'
import { normalizeThemeSetting } from '@/lib/themes'
import { PROJECTS_COLLAPSED_COOKIE, PROJECTS_COLLAPSED_VALUE } from '@/lib/sidebarState'
import type { Profile } from '@/types/database'
import type { SidebarProject } from '@/components/layout/Sidebar'

// Signed cover URLs for the sidebar's thumbnails: 24 hours, the same as the
// dashboard's cards (COVER_SIGNED_URL_TTL in actions/projects.ts). A 'use
// server' file can only export async functions, so the value is repeated.
const COVER_SIGNED_URL_TTL = 60 * 60 * 24 // 24h

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

  const [{ data }, sidebarProjects] = await Promise.all([
    user
      ? supabase.from('profiles').select('*').eq('id', user.id).single()
      : Promise.resolve({ data: null }),
    user ? loadSidebarProjects(supabase, user.id) : Promise.resolve(null),
  ])
  const profile = data as Profile | null
  const projectsCollapsed = (await cookies()).get(PROJECTS_COLLAPSED_COOKIE)?.value === PROJECTS_COLLAPSED_VALUE

  // The profile's theme, applied before paint on a full load (a new device,
  // or one changed on another device). Without a profile (a failed fetch, an
  // auth outage) the device keeps its own.
  return (
    <>
      {profile && <ThemeScript setting={normalizeThemeSetting(profile.theme)} />}
      <AppShell profile={profile} projects={sidebarProjects} projectsCollapsed={projectsCollapsed}>{children}</AppShell>
    </>
  )
}

// The sidebar's project list: the projects that aren't archived, most
// recently updated first (as on the dashboard), with their covers signed in
// one batched request. null when the list couldn't load, so the sidebar says
// so instead of "No projects yet". A cover that fails to sign falls back to
// the placeholder.
async function loadSidebarProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<SidebarProject[] | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, title, cover_image_url')
    .eq('owner_id', userId)
    .eq('archived', false)
    .order('updated_at', { ascending: false })
  if (error) return null
  const rows = (data ?? []) as { id: string; title: string; cover_image_url: string | null }[]

  const paths = rows.flatMap((row) => (row.cover_image_url ? [row.cover_image_url] : []))
  const signed = new Map<string, string>()
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage
      .from('attachments')
      .createSignedUrls(paths, COVER_SIGNED_URL_TTL)
    for (const url of urls ?? []) {
      if (url.path && url.signedUrl && !url.error) signed.set(url.path, url.signedUrl)
    }
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    cover_url: row.cover_image_url ? signed.get(row.cover_image_url) ?? null : null,
  }))
}

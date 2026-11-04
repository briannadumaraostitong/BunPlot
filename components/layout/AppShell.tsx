'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useTheme } from '@/components/theme/ThemeProvider'
import { normalizeThemeSetting } from '@/lib/themes'
import type { Profile } from '@/types/database'

interface AppShellProps {
  children: React.ReactNode
  profile: Profile | null
}

export function AppShell({ children, profile }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)
  const { adoptTheme } = useTheme()
  const profileTheme = profile ? normalizeThemeSetting(profile.theme) : null

  // The profile's theme wins over this device's. On a full load the (app)
  // layout's ThemeScript has already applied it before paint, and login
  // applies it before navigating, so this is the safety net for anything
  // else that brings a different one. Keyed on the profile's value only, so
  // a theme just picked in Settings isn't reverted by a not-yet-refreshed
  // profile.
  useEffect(() => {
    if (profileTheme) adoptTheme(profileTheme)
  }, [profileTheme, adoptTheme])

  return (
    <div className="flex h-screen bg-background bg-texture overflow-hidden">
      <Sidebar open={navOpen} onOpenChange={setNavOpen} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar profile={profile} onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { Profile } from '@/types/database'

interface AppShellProps {
  children: React.ReactNode
  profile: Profile | null
}

export function AppShell({ children, profile }: AppShellProps) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar profile={profile} open={navOpen} onOpenChange={setNavOpen} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}

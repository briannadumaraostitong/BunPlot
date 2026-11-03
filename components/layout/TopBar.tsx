'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileMenu } from './ProfileMenu'
import type { Profile } from '@/types/database'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
}

// The phone's menu button at the left, the profile menu at the right.
export function TopBar({ profile, onMenuClick }: TopBarProps) {
  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-background">
      <Button
        variant="ghost"
        size="icon"
        className="relative md:hidden after:absolute after:-inset-1.5"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Open menu</span>
      </Button>
      {/* ml-auto keeps it at the right on desktop, where the menu button is hidden. */}
      <div className="ml-auto">
        <ProfileMenu profile={profile} />
      </div>
    </header>
  )
}

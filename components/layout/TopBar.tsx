'use client'

import { useSyncExternalStore } from 'react'
import { Menu, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProfileMenu } from './ProfileMenu'
import { Logo } from '@/components/brand/Logo'
import type { Profile } from '@/types/database'

interface TopBarProps {
  profile: Profile | null
  onMenuClick: () => void
  onSearchClick: () => void
}

// Whether to show the Mac shortcut (⌘K) or Ctrl K. The server can't know, so
// it renders Ctrl K and a Mac switches right after hydration.
const noSubscribe = () => () => {}
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)

// The phone's menu button and logo mark at the left; the command menu's
// search button and the profile menu at the right. On desktop the sidebar
// shows the logo, so the mark is phone-only.
export function TopBar({ profile, onMenuClick, onSearchClick }: TopBarProps) {
  const mac = useSyncExternalStore(noSubscribe, isMac, () => false)
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
      <Logo size={24} className="ml-2 md:hidden" />
      {/* ml-auto keeps it at the right on desktop, where the menu button is hidden. */}
      <div className="ml-auto flex items-center gap-2">
        {/* Opens the command menu: the way in on phones, and where the
            shortcut is shown on desktop. */}
        <Button
          data-command-trigger=""
          variant="outline"
          size="sm"
          onClick={onSearchClick}
          aria-keyshortcuts="Control+K Meta+K"
          className="relative gap-2 text-muted-foreground after:absolute after:-inset-1.5 sm:after:hidden"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">Search</span>
          <kbd aria-hidden="true" className="hidden rounded-sm border border-border px-1 font-mono text-[10px] sm:inline">
            {mac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </Button>
        <ProfileMenu profile={profile} />
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, LogOut, Settings, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSignOut } from '@/hooks/useSignOut'
import { SignOutDialog } from './SignOutDialog'
import type { Profile } from '@/types/database'

// Up to two letters: the first of each of the name's first two words.
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// The signed-in writer's menu at the right of the top bar: their avatar (or
// initials), opening onto their name, Settings and Sign Out. profile is null
// when it couldn't be loaded (an auth outage): a person icon, and a note in
// place of the name. Not modal, so closing it as the sign-out confirmation
// opens can't leave the page unclickable (Radix's modal menu locks the page
// until it's done closing).
export function ProfileMenu({ profile }: { profile: Profile | null }) {
  const [open, setOpen] = useState(false)
  // The menu closes when the confirmation opens, and otherwise stays open
  // showing "Signing out…" until the page changes.
  const { signingOut, confirmOpen, setConfirmOpen, requestSignOut, confirmSignOut } = useSignOut({
    onConfirmNeeded: () => setOpen(false),
  })

  const displayName = profile?.display_name?.trim() || null
  const username = profile?.username?.trim() || null
  const name = displayName ?? username

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring after:absolute after:-inset-1.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {name ? initialsOf(name) : <User className="h-4 w-4 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">Account menu</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            {profile ? (
              <>
                <p className="truncate text-sm font-medium text-foreground">{name ?? 'Your account'}</p>
                {displayName && username && (
                  <p className="truncate text-xs text-muted-foreground">@{username}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Couldn&apos;t load your profile</p>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={signingOut}
            onSelect={(e) => {
              // Stays open while open edits save.
              e.preventDefault()
              requestSignOut()
            }}
          >
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
            {signingOut ? 'Signing out...' : 'Sign Out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={confirmOpen} onOpenChange={setConfirmOpen} onConfirm={confirmSignOut} />
    </>
  )
}

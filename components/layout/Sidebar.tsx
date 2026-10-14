'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Settings, Search, LogOut, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { clearAllBackups, hasAnyBackup } from '@/lib/editorBackup'
import { flushAllEdits, markSigningOut } from '@/lib/saveRegistry'
import type { Profile } from '@/types/database'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderOpen },
  { href: '/search',    label: 'Search',    icon: Search },
]

interface SidebarProps {
  profile: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ profile, open, onOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop: persistent, always in flow — unchanged from before */}
      <aside className="hidden md:flex w-60 flex-col h-full shrink-0 border-r border-border bg-sidebar">
        <SidebarContent profile={profile} onNavigate={() => {}} />
      </aside>

      {/* Mobile: hamburger-triggered overlay drawer, closes on outside-tap
          (Sheet's own overlay) or on any nav action (onNavigate below) */}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-60 max-w-[80vw] flex-col gap-0 border-sidebar-border bg-sidebar p-0 md:hidden"
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
          <SidebarContent profile={profile} onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({
  profile,
  onNavigate,
}: {
  profile: Profile | null
  onNavigate: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [signingOut, setSigningOut] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Save open edits and wait for saves in flight while still signed in. Only
  // if something didn't save, or a backup is left (here or in another outline
  // or project), ask first, since signing out deletes backups.
  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)
    const allSaved = await flushAllEdits()
    if (!allSaved || hasAnyBackup()) {
      setSigningOut(false)
      setConfirmOpen(true)
      return
    }
    await signOut()
  }

  async function signOut() {
    setConfirmOpen(false)
    setSigningOut(true)
    // Closes the mobile menu; only now, so the confirmation isn't hidden with it.
    onNavigate()
    markSigningOut()
    await supabase.auth.signOut()
    // Local drafts belong to this account; remove them so the next person
    // using this browser doesn't inherit them.
    clearAllBackups()
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.display_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 gap-1.5 shrink-0">
        <Image src="/logo.png" alt="" width={28} height={28} className="h-7 w-7" priority />
        <span className="text-xl font-semibold tracking-tight">
          BunPlot
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Bottom */}
      <div className="px-2 py-3 space-y-0.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
        >
          {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {signingOut ? 'Signing out...' : 'Sign Out'}
        </button>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign out?</DialogTitle>
              <DialogDescription>
                You have outline changes that haven&apos;t been saved. Signing out deletes them from this
                device. Sign out anyway?
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={signOut}>
                Sign out anyway
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-2.5 px-3 py-2 mt-1">
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium truncate">
            {profile?.display_name ?? 'User'}
          </span>
        </div>
      </div>
    </>
  )
}

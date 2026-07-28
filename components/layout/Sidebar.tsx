'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Profile } from '@/types/database'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderOpen },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
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
    <aside className="w-60 flex flex-col h-full shrink-0 border-r border-border bg-sidebar">
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
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>

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
    </aside>
  )
}
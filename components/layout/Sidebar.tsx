'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Logo } from '@/components/brand/Logo'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects',  label: 'Projects',  icon: FolderOpen },
  { href: '/search',    label: 'Search',    icon: Search },
]

// Settings and Sign Out are in the top bar's profile menu.
interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  return (
    <>
      {/* Desktop: persistent, always in flow — unchanged from before */}
      <aside className="hidden md:flex w-60 flex-col h-full shrink-0 border-r border-border bg-sidebar">
        <SidebarContent onNavigate={() => {}} />
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
          <SidebarContent onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {/* Logo */}
      <div className="h-14 flex items-center px-4 shrink-0">
        <Logo size={32} wordmark preload />
      </div>

      <Separator />

      {/* Navigation: roomier than the in-page lists that share the nav-item
          hook (40px rows, 15px text, 18px icons); each theme sets its own
          type through the sidebar-nav hook. */}
      <nav data-slot="sidebar-nav" className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              data-slot="nav-item"
              data-active={active || undefined}
              className={cn(
                'flex h-10 items-center gap-3 rounded-md px-3 text-[15px] font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

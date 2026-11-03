'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'

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
    </>
  )
}

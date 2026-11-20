'use client'

import { useId, useState } from 'react'
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

// A project in the sidebar's list: its title and a signed cover URL (null
// without a cover, or when it couldn't be signed).
export interface SidebarProject {
  id: string
  title: string
  cover_url: string | null
}

// Settings and Sign Out are in the top bar's profile menu.
interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // null when the list couldn't load.
  projects: SidebarProject[] | null
}

export function Sidebar({ open, onOpenChange, projects }: SidebarProps) {
  return (
    <>
      {/* Desktop: persistent, always in flow — unchanged from before */}
      <aside className="hidden md:flex w-60 flex-col h-full shrink-0 border-r border-border bg-sidebar">
        <SidebarContent projects={projects} onNavigate={() => {}} />
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
          <SidebarContent projects={projects} onNavigate={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    </>
  )
}

function SidebarContent({ projects, onNavigate }: { projects: SidebarProject[] | null; onNavigate: () => void }) {
  const pathname = usePathname()
  // The open project, when it's in the list: its entry is the active one,
  // not the Projects item (an archived project keeps Projects active).
  const currentProject = projects?.find((p) => pathname === `/projects/${p.id}` || pathname.startsWith(`/projects/${p.id}/`))

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
      <nav className="flex-1 px-2 py-3 overflow-y-auto scrollbar-thin">
        <div data-slot="sidebar-nav" className="space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = (pathname === href || pathname.startsWith(href + '/')) && !(href === '/projects' && currentProject)
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
        </div>

        <ProjectList projects={projects} currentId={currentProject?.id} onNavigate={onNavigate} />
      </nav>
    </>
  )
}

// The writer's projects under the main items: a 20×30 cover thumbnail (the
// covers are 2:3) and the title, which keeps the writer's case (it's outside
// the sidebar-nav hook, so Cyberpunk doesn't uppercase it). The open project
// takes the nav-item active style. Past about 40% of the screen the list
// scrolls on its own, so the main items stay in view.
function ProjectList({
  projects,
  currentId,
  onNavigate,
}: {
  projects: SidebarProject[] | null
  currentId: string | undefined
  onNavigate: () => void
}) {
  // The desktop sidebar and the phone drawer can both be in the page.
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="mt-4">
      <h2
        id={headingId}
        data-slot="panel-heading"
        className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        Your projects
      </h2>
      {projects === null ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">Couldn&apos;t load your projects.</p>
      ) : projects.length === 0 ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">No projects yet</p>
      ) : (
        <ul className="max-h-[40vh] space-y-0.5 overflow-y-auto scrollbar-thin">
          {projects.map((project) => {
            const active = project.id === currentId
            return (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  onClick={onNavigate}
                  data-slot="nav-item"
                  data-active={active || undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  {/* Keyed on the URL, so a fresh one (after a refresh) gets
                      a fresh try. */}
                  <ProjectThumb key={project.cover_url ?? ''} title={project.title} coverUrl={project.cover_url} />
                  <span className="truncate">{project.title}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// A project's 20×30 thumbnail: its cover, or the title's first letter
// (shown uppercase) on a token tile. The cover's signed URL lasts 24 hours,
// like the dashboard's, but the sidebar outlives the page that signed it: an
// app left open longer, with a cover still to load (the list loads them
// lazily, and the phone drawer mounts its own), would get an expired URL. A
// cover that fails to load shows the letter tile instead of a broken image.
function ProjectThumb({ title, coverUrl }: { title: string; coverUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  const showCover = coverUrl && !failed

  return (
    <span
      data-slot="sidebar-project-thumb"
      aria-hidden="true"
      className="flex h-[30px] w-5 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-secondary text-[10px] font-semibold uppercase text-muted-foreground"
    >
      {showCover ? (
        // A signed Storage URL that changes per request, at 20px: nothing for next/image to optimize.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        title.trim().charAt(0)
      )}
    </span>
  )
}

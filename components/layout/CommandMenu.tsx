'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FolderOpen, GanttChartSquare, MapPin, RotateCw, Search, Users } from 'lucide-react'
import {
  CommandDialog,
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { createClient } from '@/lib/supabase/client'
import { resultHref } from '@/lib/searchHref'
import { useSearch, type SearchStatus } from '@/hooks/useSearch'
import type { SearchResult } from '@/types/database'

export type ProjectRow = { id: string; title: string; archived: boolean }
type EntityType = Exclude<SearchResult['entity_type'], 'chapter'>

// Per group: its heading and icon (the project tabs' icons), in list order.
const ENTITY_GROUPS: { type: EntityType; heading: string; icon: typeof Users }[] = [
  { type: 'event', heading: 'Events', icon: GanttChartSquare },
  { type: 'character', heading: 'Characters', icon: Users },
  { type: 'place', heading: 'Places', icon: MapPin },
]
// Projects listed before anything is typed, and the most per group after.
const RECENT_PROJECTS = 6
const MAX_PER_GROUP = 8
// A group heading, with the hook each theme styles as its labels.
function Heading({ children }: { children: string }) {
  return <span data-slot="command-group-heading">{children}</span>
}

// What useSearch needs before it searches (MIN_QUERY_LENGTH there).
const MIN_SEARCH = 2

const PROJECT_PATH = /^\/projects\/([0-9a-f-]{36})(?:\/|$)/i

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The command menu: Ctrl+K (Cmd+K on a Mac) from anywhere in the signed-in
// app, or the search button in the top bar. Jumps to a project, or to an
// event, character or place in any project (the current project's first).
// Mounted once, in AppShell.
export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentProjectId = PROJECT_PATH.exec(pathname)?.[1] ?? null

  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState<ProjectRow[] | null>(null)
  const [projectsFailed, setProjectsFailed] = useState(false)
  const [projectsAttempt, setProjectsAttempt] = useState(0)
  const { results, status, retry } = useSearch(query, null)

  // The shortcut. preventDefault keeps the browser from focusing its own
  // search box. Ignored mid-composition (an input method's Ctrl+K) and while
  // another dialog is open, so it never stacks on top of one.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey) return
      if (e.isComposing || e.repeat) return
      // While this menu is closed, any open dialog is someone else's.
      if (!open && document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return
      e.preventDefault()
      onOpenChange(!open)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  // The project list, fresh each time the menu opens.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    createClient()
      .from('projects')
      .select('id, title, archived')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        setProjectsFailed(!!error)
        if (!error) setProjects((data ?? []) as ProjectRow[])
      })
    return () => {
      cancelled = true
    }
  }, [open, projectsAttempt])

  function handleOpenChange(next: boolean) {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  function go(href: string) {
    handleOpenChange(false)
    router.push(href)
  }

  return (
    <CommandMenuView
      open={open}
      onOpenChange={handleOpenChange}
      query={query}
      onQueryChange={setQuery}
      projects={projects}
      projectsFailed={projectsFailed}
      onRetryProjects={() => setProjectsAttempt((n) => n + 1)}
      results={results}
      status={status}
      onRetrySearch={retry}
      currentProjectId={currentProjectId}
      onGo={go}
    />
  )
}

interface CommandMenuViewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  query: string
  onQueryChange: (query: string) => void
  // null until the first load finishes.
  projects: ProjectRow[] | null
  projectsFailed: boolean
  onRetryProjects: () => void
  results: SearchResult[]
  status: SearchStatus
  onRetrySearch: () => void
  currentProjectId: string | null
  onGo: (href: string) => void
}

// The menu itself, from data it's given (CommandMenu loads it), so it can
// render on its own.
export function CommandMenuView({
  open,
  onOpenChange,
  query,
  onQueryChange,
  projects,
  projectsFailed,
  onRetryProjects,
  results,
  status,
  onRetrySearch,
  currentProjectId,
  onGo,
}: CommandMenuViewProps) {
  const trimmed = query.trim()
  const needle = trimmed.toLowerCase()
  const matchedProjects = (projects ?? [])
    .filter((p) => (needle ? p.title.toLowerCase().includes(needle) : !p.archived))
    .slice(0, needle ? MAX_PER_GROUP : RECENT_PROJECTS)

  // The current project's results first; the RPC's ranking otherwise.
  const searching = trimmed.length >= MIN_SEARCH
  const entities = searching && status === 'results'
    ? results
        .filter((r): r is SearchResult & { entity_type: EntityType } => r.entity_type !== 'chapter')
        .map((r, i) => ({ r, i }))
        .sort((a, b) => Number(b.r.project_id === currentProjectId) - Number(a.r.project_id === currentProjectId) || a.i - b.i)
        .map(({ r }) => r)
    : []
  const groups = ENTITY_GROUPS.map((g) => ({ ...g, items: entities.filter((r) => r.entity_type === g.type).slice(0, MAX_PER_GROUP) }))
  const entityCount = groups.reduce((n, g) => n + g.items.length, 0)
  const total = matchedProjects.length + entityCount

  // What the polite live region announces, so a screen reader hears the
  // outcome of each search without the list taking focus.
  const announcement = !trimmed
    ? ''
    : status === 'loading'
      ? 'Searching…'
      : status === 'error'
        ? 'Search failed'
        : total === 0
          ? 'No matches'
          : `${total} ${total === 1 ? 'result' : 'results'}`

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search your projects, events, characters and places, then press Enter to open one."
    >
      {/* Results come from the server and are matched there, so cmdk's own
          filtering is off. label names the input: cmdk renders it as the
          input's hidden <label>. */}
      <Command label="Search projects, events, characters and places" shouldFilter={false} loop>
        <CommandInput
          value={query}
          onValueChange={onQueryChange}
          placeholder="Search"
        />
        <CommandList>
          {projectsFailed && (
            <CommandGroup heading={<Heading>Projects</Heading>}>
              <CommandItem value="retry-projects" onSelect={onRetryProjects}>
                <RotateCw aria-hidden="true" />
                <span>Couldn&apos;t load your projects. Try again</span>
              </CommandItem>
            </CommandGroup>
          )}

          {matchedProjects.length > 0 && (
            <CommandGroup heading={<Heading>{needle ? 'Projects' : 'Recent projects'}</Heading>}>
              {matchedProjects.map((p) => (
                <CommandItem key={p.id} value={`project:${p.id}`} onSelect={() => onGo(`/projects/${p.id}`)}>
                  <FolderOpen aria-hidden="true" className="text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{p.title}</span>
                  {p.archived && <span className="shrink-0 text-xs text-muted-foreground">Archived</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groups.map(({ type, heading, icon: Icon, items }) =>
            items.length > 0 ? (
              <CommandGroup key={type} heading={<Heading>{heading}</Heading>}>
                {items.map((r) => (
                  <CommandItem key={r.id} value={`${type}:${r.id}`} onSelect={() => onGo(resultHref(r))}>
                    <Icon aria-hidden="true" className="text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="max-w-40 shrink-0 truncate text-xs text-muted-foreground">{r.project_title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null
          )}

          {searching && status === 'loading' && entityCount === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          )}
          {searching && status === 'empty' && matchedProjects.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">{`No matches for “${trimmed}”.`}</p>
          )}

          {searching && (
            <CommandGroup heading={<Heading>More</Heading>}>
              {status === 'error' && (
                <CommandItem value="retry-search" onSelect={onRetrySearch}>
                  <RotateCw aria-hidden="true" />
                  <span>Couldn&apos;t search. Try again</span>
                </CommandItem>
              )}
              <CommandItem value="search-everything" onSelect={() => onGo(`/search?q=${encodeURIComponent(trimmed)}`)}>
                <Search aria-hidden="true" className="text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{`Search everything for “${trimmed}”`}</span>
              </CommandItem>
            </CommandGroup>
          )}

          {!trimmed && projects === null && !projectsFailed && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading projects…</p>
          )}
          {!trimmed && projects !== null && matchedProjects.length === 0 && !projectsFailed && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type to search your projects, events, characters and places.</p>
          )}
        </CommandList>
        <div role="status" className="sr-only">
          {announcement}
        </div>
      </Command>
    </CommandDialog>
  )
}

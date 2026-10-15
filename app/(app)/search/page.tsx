'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CloudOff, Search, SearchX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useSearch } from '@/hooks/useSearch'
import type { SearchResult } from '@/types/database'

const TYPE_LABEL: Record<SearchResult['entity_type'], string> = {
  character: 'Character',
  event: 'Event',
  place: 'Place',
  chapter: 'Chapter',
}

function resultHref(result: SearchResult): string {
  switch (result.entity_type) {
    case 'character':
      return `/projects/${result.project_id}?tab=characters&entity=${result.id}`
    case 'place':
      return `/projects/${result.project_id}?tab=places&entity=${result.id}`
    case 'event':
      return `/projects/${result.project_id}?tab=timeline&entity=${result.id}`
    case 'chapter':
      // No chapter detail panel exists anywhere to deep-link into —
      // chapters are just grid columns — so this lands on the project's
      // Timeline tab only, same as clicking through would today.
      return `/projects/${result.project_id}`
  }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const projectParam = searchParams.get('project')

  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'project' | 'all'>(projectParam ? 'project' : 'all')

  const { results, status, error, retry } = useSearch(query, scope === 'project' ? projectParam : null)

  if (error) console.error('Search failed:', error)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search characters, events, places, chapters..."
              className="pl-9"
            />
          </div>

          {projectParam && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1 shrink-0">
              <button
                onClick={() => setScope('project')}
                className={cn(
                  'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                  scope === 'project'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                This Project
              </button>
              <button
                onClick={() => setScope('all')}
                className={cn(
                  'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                  scope === 'all'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All Projects
              </button>
            </div>
          )}
        </div>
      </div>

      {status === 'idle' && (
        <EmptyState
          icon={Search}
          title="Type to search"
          hint="Searches characters, events, places, and chapters"
          className="h-64"
        />
      )}

      {status === 'loading' && (
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <Skeleton className="h-4 w-14 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <EmptyState
          icon={CloudOff}
          title="Couldn't search."
          hint="Check your connection and try again."
          action={
            <Button size="sm" variant="outline" onClick={retry}>
              Retry
            </Button>
          }
          className="h-64"
        />
      )}

      {status === 'empty' && (
        <EmptyState icon={SearchX} title="No results found" className="h-64" />
      )}

      {status === 'results' && (
        <div className="space-y-1.5">
          {results.map((result) => (
            <Link
              key={`${result.entity_type}-${result.id}`}
              href={resultHref(result)}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:border-primary hover:bg-secondary/30"
            >
              <span className="shrink-0 rounded-full border border-border bg-secondary/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {TYPE_LABEL[result.entity_type]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{result.title}</span>
              {scope === 'all' && (
                <span className="max-w-40 shrink-0 truncate text-xs text-muted-foreground">
                  {result.project_title}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import { cn } from '@/lib/utils'
import type { Metadata } from 'next'
import type { Project } from '@/types/database'
import type { ProjectStats } from '@/components/projects/ProjectCard'

export const metadata: Metadata = { title: 'Projects' }

interface Props {
  searchParams: Promise<{ view?: string }>
}

// Mirrors the Tiptap JSON walker in PlaceCard.tsx / dashboard/page.tsx — no
// server-safe editor.getText() exists without a real editor instance, so
// plain text is pulled directly from the content tree instead.
function tiptapPlainText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const obj = node as Record<string, unknown>
  let text = typeof obj.text === 'string' ? obj.text : ''
  if (Array.isArray(obj.content)) {
    text += ' ' + obj.content.map(tiptapPlainText).join(' ')
  }
  return text
}

function countWords(content: Record<string, unknown> | null | undefined): number {
  if (!content) return 0
  const text = tiptapPlainText(content).trim()
  return text ? text.split(/\s+/).length : 0
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { view } = await searchParams
  const showArchived = view === 'archived'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user!.id)
    .eq('archived', showArchived)
    .order('updated_at', { ascending: false })

  const projects = (data ?? []) as Project[]

  // One bulk query per table (not per project) — counts are tallied in
  // memory rather than issued as N separate count() calls.
  const statsByProject: Record<string, ProjectStats> = {}
  for (const p of projects) {
    statsByProject[p.id] = { wordCount: 0, eventCount: 0, chapterCount: 0, characterCount: 0 }
  }

  const projectIds = projects.map((p) => p.id)
  if (projectIds.length > 0) {
    const [
      { data: eventsData },
      { data: chaptersData },
      { data: charactersData },
      { data: outlinesData },
    ] = await Promise.all([
      supabase.from('events').select('project_id').in('project_id', projectIds),
      supabase.from('chapters').select('project_id').in('project_id', projectIds),
      supabase.from('characters').select('project_id').in('project_id', projectIds),
      supabase.from('outlines').select('project_id, content').in('project_id', projectIds),
    ])

    for (const row of (eventsData ?? []) as { project_id: string }[]) {
      statsByProject[row.project_id].eventCount++
    }
    for (const row of (chaptersData ?? []) as { project_id: string }[]) {
      statsByProject[row.project_id].chapterCount++
    }
    for (const row of (charactersData ?? []) as { project_id: string }[]) {
      statsByProject[row.project_id].characterCount++
    }
    for (const row of (outlinesData ?? []) as {
      project_id: string
      content: Record<string, unknown> | null
    }[]) {
      statsByProject[row.project_id].wordCount += countWords(row.content)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            <Link
              href="/projects"
              className={cn(
                'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                !showArchived
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Active
            </Link>
            <Link
              href="/projects?view=archived"
              className={cn(
                'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                showArchived
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Archived
            </Link>
          </div>
          <NewProjectDialog />
        </div>
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} stats={statsByProject[project.id]} />
          ))}
        </div>
      ) : showArchived ? (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm">No archived projects</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm">No projects yet</p>
          <NewProjectDialog trigger="Create your first project" />
        </div>
      )}
    </div>
  )
}
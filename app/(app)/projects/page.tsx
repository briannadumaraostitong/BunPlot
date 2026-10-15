import Link from 'next/link'
import { Archive, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/requireUser'
import { withProjectCoverUrls } from '@/actions/projects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { COVER_GRID_CLASS } from '@/lib/coverGrid'
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
  const user = await requireUser(supabase)

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user.id)
    .eq('archived', showArchived)
    .order('updated_at', { ascending: false })

  // Without this, a failed load shows "No projects yet". Stats stay best-effort.
  if (error) throw new Error(`Couldn't load projects: ${error.message}`)

  const projects = await withProjectCoverUrls(supabase, (data ?? []) as Project[])

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
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
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
        <div className={COVER_GRID_CLASS}>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} stats={statsByProject[project.id]} />
          ))}
        </div>
      ) : showArchived ? (
        <EmptyState icon={Archive} title="No archived projects" className="h-64" />
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No projects yet"
          action={<NewProjectDialog trigger="Create your first project" />}
          className="h-64"
        />
      )}
    </div>
  )
}
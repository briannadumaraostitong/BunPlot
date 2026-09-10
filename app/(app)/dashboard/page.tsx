import { createClient } from '@/lib/supabase/server'
import { withProjectCoverUrls } from '@/actions/projects'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import { NewFolderDialog } from '@/components/projects/NewFolderDialog'
import { FolderSection } from '@/components/projects/FolderSection'
import type { Metadata } from 'next'
import type { Project, ProjectFolder } from '@/types/database'
import type { ProjectStats } from '@/components/projects/ProjectCard'

export const metadata: Metadata = { title: 'Dashboard' }

// Mirrors the Tiptap JSON walker in PlaceCard.tsx — no server-safe
// editor.getText() exists without a real editor instance, so plain text is
// pulled directly from the content tree instead.
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: projectsData }, { data: foldersData }] = await Promise.all([
    supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('archived', false)
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_folders')
      .select('*')
      .eq('owner_id', user!.id)
      .order('position'),
  ])

  const projects = await withProjectCoverUrls(supabase, (projectsData ?? []) as Project[])
  const folders = (foldersData ?? []) as ProjectFolder[]

  const ungroupedProjects = projects.filter((p) => !p.folder_id)

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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Your Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NewFolderDialog />
          <NewProjectDialog />
        </div>
      </div>

      {projects.length > 0 ? (
        <>
          {ungroupedProjects.length > 0 && (
            <div className="space-y-2">
              {folders.length > 0 && (
                <h2 className="text-sm font-semibold text-muted-foreground">
                  All Projects
                </h2>
              )}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-4">
                {ungroupedProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    folders={folders}
                    stats={statsByProject[project.id]}
                  />
                ))}
              </div>
            </div>
          )}

          {folders.map((folder) => (
            <FolderSection
              key={folder.id}
              folder={folder}
              projects={projects.filter((p) => p.folder_id === folder.id)}
              allFolders={folders}
              statsByProject={statsByProject}
            />
          ))}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center space-y-3 rounded-xl border border-dashed border-border">
          <p className="text-muted-foreground text-sm">No projects yet</p>
          <NewProjectDialog trigger="Create your first project" />
        </div>
      )}
    </div>
  )
}
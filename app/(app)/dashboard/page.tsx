import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import { NewFolderDialog } from '@/components/projects/NewFolderDialog'
import { FolderSection } from '@/components/projects/FolderSection'
import type { Metadata } from 'next'
import type { Project, ProjectFolder } from '@/types/database'

export const metadata: Metadata = { title: 'Dashboard' }

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

  const projects = (projectsData ?? []) as Project[]
  const folders = (foldersData ?? []) as ProjectFolder[]

  const ungroupedProjects = projects.filter((p) => !p.folder_id)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {ungroupedProjects.map((project) => (
                  <ProjectCard key={project.id} project={project} folders={folders} />
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
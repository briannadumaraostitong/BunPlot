import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { NewProjectDialog } from '@/components/projects/NewProjectDialog'
import type { Metadata } from 'next'
import type { Project } from '@/types/database'

export const metadata: Metadata = { title: 'Projects' }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', user!.id)
    .eq('archived', false)
    .order('updated_at', { ascending: false })

  const projects = (data ?? []) as Project[]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
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
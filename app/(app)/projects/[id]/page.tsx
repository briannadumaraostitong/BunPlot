import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectView } from '@/components/timeline/ProjectView'
import type { Metadata } from 'next'
import type { Project, Layer, Event, Chapter, Status } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('title')
    .eq('id', id)
    .single()
  const project = data as { title: string } | null
  return { title: project?.title ?? 'Project' }
}

export default async function ProjectPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  const project = data as Project | null
  if (!project) notFound()

  const { data: layersData } = await supabase
    .from('layers')
    .select('*')
    .eq('project_id', id)
    .order('position')

  const { data: eventsData } = await supabase
    .from('events')
    .select('*')
    .eq('project_id', id)
    .order('position')

  const { data: chaptersData } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', id)
    .order('position')

  const { data: statusesData } = await supabase
    .from('statuses')
    .select('*')
    .eq('project_id', id)
    .order('position')

  return (
    <ProjectView
      project={project}
      initialLayers={(layersData ?? []) as Layer[]}
      initialEvents={(eventsData ?? []) as Event[]}
      initialChapters={(chaptersData ?? []) as Chapter[]}
      initialStatuses={(statusesData ?? []) as Status[]}
    />
  )
}
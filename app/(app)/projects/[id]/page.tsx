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

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  // PGRST116 is .single() finding no row (a missing project, or one RLS
  // hides); 22P02 is an id that isn't a valid UUID. Both are a 404. Anything
  // else is a failed load, which error.tsx shows with a Retry.
  if (error && error.code !== 'PGRST116' && error.code !== '22P02') {
    throw new Error(`Couldn't load project: ${error.message}`)
  }
  const project = data as Project | null
  if (!project) notFound()

  const { data: layersData, error: layersError } = await supabase
    .from('layers')
    .select('*')
    .eq('project_id', id)
    .order('position')

  const { data: eventsData, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .eq('project_id', id)
    .order('position')
    // Tiebreaker so events sharing a position keep the same order on every load.
    .order('created_at')

  const { data: chaptersData, error: chaptersError } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', id)
    .order('position')

  const { data: statusesData, error: statusesError } = await supabase
    .from('statuses')
    .select('*')
    .eq('project_id', id)
    .order('position')

  // A partly loaded timeline looks like an empty project and invites edits on
  // top of data that's really there, so any failed load fails the whole page.
  const loadError = layersError ?? eventsError ?? chaptersError ?? statusesError
  if (loadError) throw new Error(`Couldn't load project data: ${loadError.message}`)

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
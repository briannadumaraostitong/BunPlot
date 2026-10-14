'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateEventInput {
  project_id: string
  layer_id: string
  chapter_id?: string | null
  title: string
  description?: string
  position?: number
  duration?: number
  color?: string
  start_date?: string
  end_date?: string
}

export async function createEvent(input: CreateEventInput) {
  const supabase = await createClient()

  // status_id has no DB default (unlike the deprecated status column), so
  // every new event needs one resolved explicitly or every status-pill
  // lookup added in this migration would find nothing for it.
  const { data: defaultStatusRow } = await supabase
    .from('statuses')
    .select('id')
    .eq('project_id', input.project_id)
    .eq('is_default', true)
    .single()

  const defaultStatus = defaultStatusRow as { id: string } | null

  const { data, error } = await supabase
    .from('events')
    .insert({
      ...input,
      status_id: defaultStatus?.id,
      position: input.position ?? 0,
      duration: input.duration ?? 0.05,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${input.project_id}`)
  return data
}

export async function updateEvent(
  id: string,
  projectId: string,
  updates: Partial<{
    title: string
    description: string
    notes: string
    position: number
    duration: number
    color: string
    status_id: string
    tension_level: number
    word_count: number
    start_date: string
    end_date: string
    layer_id: string
    chapter_id: string | null
    custom_fields: Record<string, unknown>
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteEvent(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderEvents(projectId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('events')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
  // Each row is its own update; report the first failure instead of
  // claiming the whole order saved.
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  return { success: true }
}

export async function moveEventToChapter(
  id: string,
  projectId: string,
  chapterId: string,
  layerId?: string
) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { chapter_id: chapterId }
  if (layerId) updates.layer_id = layerId

  const { error } = await supabase
    .from('events')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function duplicateEvent(eventId: string, projectId: string) {
  const supabase = await createClient()

  const { data: original, error: fetchError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (fetchError || !original) return { error: 'Event not found' }

  const orig = original as {
    layer_id: string
    chapter_id: string | null
    title: string
    description: string | null
    notes: string | null
    status_id: string | null
    color: string | null
    position: number
    duration: number
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      project_id: projectId,
      layer_id: orig.layer_id,
      chapter_id: orig.chapter_id,
      title: `${orig.title} (Copy)`,
      description: orig.description,
      notes: orig.notes,
      status_id: orig.status_id,
      color: orig.color,
      position: orig.position,
      duration: orig.duration,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data
}
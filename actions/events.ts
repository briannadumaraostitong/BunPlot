'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EventStatus } from '@/types/database'

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
  const { data, error } = await supabase
    .from('events')
    .insert({
      ...input,
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
    status: EventStatus
    tension_level: number
    word_count: number
    tags: string[]
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
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('events')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
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
    status: string
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
      status: orig.status,
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
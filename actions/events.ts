'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EventStatus } from '@/types/database'

interface CreateEventInput {
  project_id: string
  layer_id: string
  title: string
  description?: string
  position: number
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

export async function moveEvent(
  id: string,
  projectId: string,
  newPosition: number,
  newLayerId?: string
) {
  const supabase = await createClient()
  const updates: Record<string, unknown> = { position: newPosition }
  if (newLayerId) updates.layer_id = newLayerId

  const { error } = await supabase
    .from('events')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  return { success: true }
}
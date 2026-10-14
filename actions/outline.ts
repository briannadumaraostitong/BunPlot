'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Outline } from '@/types/database'

export async function getOutlines(projectId: string): Promise<Outline[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('outlines')
    .select('*')
    .eq('project_id', projectId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Get outlines error:', error)
    return []
  }

  const outlines = (data ?? []) as Outline[]
  if (outlines.length > 0) return outlines

  const { data: created, error: createError } = await supabase
    .from('outlines')
    .insert({ project_id: projectId, name: 'Outline', position: 0, content: {} } as never)
    .select()
    .single()

  if (createError) {
    console.error('Create default outline error:', createError)
    return []
  }

  return [created as Outline]
}

export async function createOutline(
  projectId: string,
  name: string
): Promise<Outline | { error: string }> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('outlines')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const existingOutline = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingOutline?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('outlines')
    .insert({ project_id: projectId, name, position: nextPosition, content: {} } as never)
    .select()
    .single()

  if (error) {
    console.error('Create outline error:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return data as Outline
}

export async function updateOutline(
  id: string,
  content: Record<string, unknown>
): Promise<{ error: string } | { success: true; updated_at: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('outlines')
    .update({ content } as never)
    .eq('id', id)
    .select('updated_at')

  if (error) {
    console.error('Update outline error:', error)
    return { error: error.message }
  }

  // The new updated_at, so the editor knows which saved version its next
  // edits build on. Null when no row was updated (e.g. deleted meanwhile).
  const row = (data ?? [])[0] as { updated_at: string } | undefined
  return { success: true, updated_at: row?.updated_at ?? null }
}

export async function renameOutline(
  id: string,
  name: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('outlines')
    .update({ name } as never)
    .eq('id', id)

  if (error) {
    console.error('Rename outline error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteOutline(
  id: string,
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('outlines')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Delete outline error:', error)
    return { error: error.message }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

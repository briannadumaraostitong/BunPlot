'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LAYER_COLORS } from '@/lib/theme.config'
import type { Status } from '@/types/database'

export async function getStatuses(
  projectId: string
): Promise<{ error: string } | Status[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('statuses')
    .select('*')
    .eq('project_id', projectId)
    .order('position')

  if (error) return { error: error.message }
  return data as Status[]
}

export async function createStatus(
  projectId: string,
  name: string,
  color?: string
): Promise<{ error: string } | Status> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('statuses')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const existingStatus = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingStatus?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('statuses')
    .insert({
      project_id: projectId,
      name,
      color: color ?? LAYER_COLORS[nextPosition % LAYER_COLORS.length],
      is_default: false,
      position: nextPosition,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data as Status
}

export async function updateStatus(
  id: string,
  projectId: string,
  updates: {
    name?: string
    color?: string
  }
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('statuses')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderStatuses(
  projectId: string,
  orderedIds: string[]
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('statuses')
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

export async function setDefaultStatus(
  id: string,
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  // Two sequential updates, not one — unsetting and setting in the same
  // statement could momentarily violate idx_statuses_one_default_per_project.
  const { error: unsetError } = await supabase
    .from('statuses')
    .update({ is_default: false } as never)
    .eq('project_id', projectId)
    .eq('is_default', true)

  if (unsetError) return { error: unsetError.message }

  const { error: setError } = await supabase
    .from('statuses')
    .update({ is_default: true } as never)
    .eq('id', id)

  if (setError) return { error: setError.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteStatus(
  id: string,
  projectId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  const { data: target } = await supabase
    .from('statuses')
    .select('is_default')
    .eq('id', id)
    .single()

  const targetStatus = target as { is_default: boolean } | null

  if (targetStatus?.is_default) {
    return { error: 'Cannot delete the default status — set another status as default first' }
  }

  const { data: defaultRow } = await supabase
    .from('statuses')
    .select('id')
    .eq('project_id', projectId)
    .eq('is_default', true)
    .single()

  const defaultStatus = defaultRow as { id: string } | null

  if (!defaultStatus) {
    return { error: 'No default status found for this project' }
  }

  // status_id is ON DELETE RESTRICT (unlike layers' ON DELETE CASCADE on
  // events.layer_id), so events pointing at this status must be reassigned
  // before the row can be deleted.
  const { error: reassignError } = await supabase
    .from('events')
    .update({ status_id: defaultStatus.id } as never)
    .eq('status_id', id)

  if (reassignError) return { error: reassignError.message }

  const { error: deleteError } = await supabase
    .from('statuses')
    .delete()
    .eq('id', id)

  if (deleteError) return { error: deleteError.message }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

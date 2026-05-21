'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { LAYER_COLORS } from '@/lib/theme.config'
import type { LayerType } from '@/types/database'

export async function createLayer(
  projectId: string,
  name: string,
  type: LayerType = 'custom'
) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('layers')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const existingLayer = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingLayer?.position ?? -1) + 1
  const color = LAYER_COLORS[nextPosition % LAYER_COLORS.length]

  const { data, error } = await supabase
    .from('layers')
    .insert({
      project_id: projectId,
      name,
      type,
      color,
      position: nextPosition,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data
}

export async function updateLayer(
  id: string,
  projectId: string,
  updates: {
    name?: string
    color?: string
    visible?: boolean
    locked?: boolean
  }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('layers')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderLayers(projectId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('layers')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteLayer(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('layers')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
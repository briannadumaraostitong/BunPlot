'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createChapter(projectId: string, title: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('chapters')
    .select('position')
    .eq('project_id', projectId)
    .order('position', { ascending: false })
    .limit(1)

  const existingChapter = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingChapter?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      project_id: projectId,
      title,
      position: nextPosition,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data
}

export async function updateChapter(
  id: string,
  projectId: string,
  title: string
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chapters')
    .update({ title } as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteChapter(id: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderChapters(projectId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('chapters')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
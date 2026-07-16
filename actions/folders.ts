'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createFolder(name: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated — please sign in again' }
  }

  const { data: existing } = await supabase
    .from('project_folders')
    .select('position')
    .eq('owner_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const existingFolder = existing?.[0] as { position: number } | undefined
  const nextPosition = (existingFolder?.position ?? -1) + 1

  const { data, error } = await supabase
    .from('project_folders')
    .insert({
      owner_id: user.id,
      name,
      position: nextPosition,
      collapsed: false,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return data
}

export async function updateFolder(
  id: string,
  updates: { name?: string; collapsed?: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_folders')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteFolder(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_folders')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

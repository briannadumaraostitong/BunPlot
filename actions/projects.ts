'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AppMode } from '@/types/database'

interface CreateProjectInput {
  title: string
  description?: string
  mode?: AppMode
}

export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { data: project, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description || null,
      mode: input.mode ?? 'basic',
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }

  await supabase.from('layers').insert({
    project_id: project.id,
    name: 'Main Timeline',
    type: 'main',
    color: '#6366F1',
    position: 0,
  } as never)

  revalidatePath('/dashboard')
  return project
}

export async function updateProject(
  id: string,
  updates: { title?: string; description?: string; mode?: AppMode }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${id}`)
  return { success: true }
}

export async function archiveProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived: true } as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated — please sign in again' }
  }

  const { data: projectData, error: projectError } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      title: input.title,
      description: input.description || null,
      mode: input.mode ?? 'basic',
      settings: {},
      archived: false,
    } as never)
    .select()
    .single()

  if (projectError) {
    console.error('Project insert error:', projectError)
    return { error: projectError.message }
  }

  const project = projectData as { id: string; [key: string]: unknown }

  const { error: layerError } = await supabase
    .from('layers')
    .insert({
      project_id: project.id,
      name: 'Main Timeline',
      type: 'main',
      color: '#6366F1',
      position: 0,
      visible: true,
      locked: false,
      metadata: {},
    } as never)

  if (layerError) {
    console.error('Layer insert error:', layerError)
  }

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

export async function moveProjectToFolder(id: string, folderId: string | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ folder_id: folderId } as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
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
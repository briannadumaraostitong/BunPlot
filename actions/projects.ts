'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AppMode, Project } from '@/types/database'

// Cover images live in the private 'attachments' bucket, same as Places and
// Panels — see withCoverUrls in actions/places.ts. Recomputed on every list
// fetch, so a short TTL is fine.
const COVER_SIGNED_URL_TTL = 60 * 60 * 24 // 24h

export interface ProjectWithCover extends Project {
  cover_url: string | null
}

export async function withProjectCoverUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projects: Project[]
): Promise<ProjectWithCover[]> {
  return Promise.all(
    projects.map(async (project) => {
      if (!project.cover_image_url) return { ...project, cover_url: null }
      const { data } = await supabase.storage
        .from('attachments')
        .createSignedUrl(project.cover_image_url, COVER_SIGNED_URL_TTL)
      return { ...project, cover_url: data?.signedUrl ?? null }
    })
  )
}

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

  const project = projectData as Project

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
  updates: { title?: string; description?: string; mode?: AppMode; cover_image_url?: string | null }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(updates as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/projects/${id}`)
  revalidatePath('/dashboard')
  revalidatePath('/projects')
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

export async function duplicateProject(
  id: string,
  title: string,
  mode: 'full' | 'structure'
): Promise<{ error: string } | { id: string }> {
  const supabase = await createClient()
  // `as never` cast: Database['public']['Tables'] entries don't declare
  // `Relationships`, so they don't structurally satisfy postgrest-js's
  // GenericTable — the same untyped-client gap CLAUDE.md documents for
  // .insert()/.update(), here breaking .rpc()'s Args inference for the
  // whole Functions map instead.
  const { data, error } = await supabase.rpc('duplicate_project', {
    p_source_project_id: id,
    p_new_title: title,
    p_mode: mode,
  } as never)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { id: data }
}

export async function archiveProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived: true } as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true }
}

export async function unarchiveProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update({ archived: false } as never)
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath('/projects')
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
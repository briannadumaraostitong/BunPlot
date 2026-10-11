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
  updates: { title?: string; description?: string | null; mode?: AppMode; cover_image_url?: string | null }
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

// duplicate_project (SQL) copies cover_image_url and, in full mode,
// places.image_url as-is, so straight after the RPC the copy points at the
// original's files — and replacing or removing a cover in either project
// deletes the one file both use. SQL can't copy Storage objects, so this
// gives the copy its own: copies each cover file under the new project's
// prefix and repoints the row. A failed copy sets that cover to NULL rather
// than leaving it shared; the duplicate itself still succeeds.
//
// Rich-text images (outline content, old place/chapter descriptions) are
// still shared: their signed URLs are copied verbatim inside the content.
// That must be handled before any project-delete cleanup removes a
// project's files, or deleting one project will break the other's images.
async function copyCoverFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromPath: string,
  destPrefix: string
): Promise<string | null> {
  const toPath = `${destPrefix}/${fromPath.slice(fromPath.lastIndexOf('/') + 1)}`
  const { error } = await supabase.storage.from('attachments').copy(fromPath, toPath)
  if (error) {
    console.error('Duplicate cover copy error:', fromPath, error)
    return null
  }
  return toPath
}

async function unshareDuplicatedCovers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  newProjectId: string,
  mode: 'full' | 'structure'
) {
  // Project cover — copied by duplicate_project in both modes.
  const { data: projectRow, error: projectErr } = await supabase
    .from('projects')
    .select('cover_image_url')
    .eq('id', newProjectId)
    .single()
  const sharedCover = (projectRow as { cover_image_url: string | null } | null)?.cover_image_url ?? null
  if (projectErr || sharedCover) {
    if (projectErr) console.error('Duplicate cover lookup error:', projectErr)
    const newPath = sharedCover ? await copyCoverFile(supabase, sharedCover, `projects/${newProjectId}`) : null
    const { error } = await supabase
      .from('projects')
      .update({ cover_image_url: newPath } as never)
      .eq('id', newProjectId)
    if (error) console.error('Duplicate cover update error:', error)
  }

  // Place covers — places are only copied in full mode. Each copied place
  // still holds the original's path, which is all the copy needs; the
  // destination uses the copy's own place id.
  if (mode !== 'full') return
  const { data: placeRows, error: placesErr } = await supabase
    .from('places')
    .select('id, image_url')
    .eq('project_id', newProjectId)
    .not('image_url', 'is', null)
  if (placesErr) {
    // Can't tell which covers are shared, so unshare them all rather than
    // leave any pointing at the original's files.
    console.error('Duplicate place cover lookup error:', placesErr)
    const { error } = await supabase
      .from('places')
      .update({ image_url: null } as never)
      .eq('project_id', newProjectId)
    if (error) console.error('Duplicate place cover reset error:', error)
    return
  }

  await Promise.all(
    ((placeRows ?? []) as { id: string; image_url: string }[]).map(async (place) => {
      const newPath = await copyCoverFile(supabase, place.image_url, `places/${newProjectId}/${place.id}`)
      const { error } = await supabase
        .from('places')
        .update({ image_url: newPath } as never)
        .eq('id', place.id)
      if (error) console.error('Duplicate place cover update error:', place.id, error)
    })
  )
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

  const newProjectId = data as string
  try {
    await unshareDuplicatedCovers(supabase, newProjectId, mode)
  } catch (err) {
    // Never fail the duplicate over covers — it already exists by now.
    console.error('Duplicate cover unsharing error:', err)
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { id: newProjectId }
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
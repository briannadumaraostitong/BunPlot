'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { attachmentPathFromSignedUrl, listFilesRecursive, removeInBatches } from '@/lib/storage/attachments'
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

// Same expiry OutlineEditor gives embedded image URLs (10 years), since
// these are baked into saved content rather than re-signed on load.
const OUTLINE_IMAGE_URL_TTL = 60 * 60 * 24 * 365 * 10

type TiptapNode = { type?: string; attrs?: Record<string, unknown>; content?: TiptapNode[] }

function collectImageSrcs(node: TiptapNode, out: Set<string>) {
  if (node.type === 'image' && typeof node.attrs?.src === 'string') out.add(node.attrs.src)
  node.content?.forEach((child) => collectImageSrcs(child, out))
}

// Rewrites matching image srcs in place (other attrs untouched); returns
// whether anything changed.
function rewriteImageSrcs(node: TiptapNode, srcMap: Map<string, string>): boolean {
  let changed = false
  if (node.type === 'image' && node.attrs && typeof node.attrs.src === 'string') {
    const next = srcMap.get(node.attrs.src)
    if (next) {
      node.attrs.src = next
      changed = true
    }
  }
  for (const child of node.content ?? []) {
    if (rewriteImageSrcs(child, srcMap)) changed = true
  }
  return changed
}

// duplicate_project copies outlines.content verbatim, so a copy's images
// keep signed URLs into another project's files (normally the original's
// outlines/{originalProjectId}/…). Copies each such file once into
// outlines/{newProjectId}/, re-signs it, and rewrites every src pointing at
// it, so the copy owns its images.
//
// A failed copy (or re-sign) keeps the shared src and logs: the image keeps
// working while the original's file exists, which beats dropping it now. So
// sharing can still remain — from those failures and from duplicates made
// before this ran — and any project-delete cleanup must check for remaining
// references before removing outlines/ files.
//
// Old chapter descriptions are left shared on purpose: nothing displays them
// any more.
async function unshareDuplicatedOutlineImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  newProjectId: string
) {
  const { data, error } = await supabase.from('outlines').select('id, content').eq('project_id', newProjectId)
  if (error) {
    console.error('Duplicate outline lookup error:', error)
    return
  }
  const outlines = (data ?? []) as { id: string; content: TiptapNode }[]

  // Every image src that points at a file under some other project.
  const sourceBySrc = new Map<string, string>()
  for (const outline of outlines) {
    const srcs = new Set<string>()
    collectImageSrcs(outline.content, srcs)
    for (const src of srcs) {
      const path = attachmentPathFromSignedUrl(src)
      if (path && path.split('/')[1] !== newProjectId) sourceBySrc.set(src, path)
    }
  }
  if (sourceBySrc.size === 0) return

  // One destination per distinct source file; a numeric prefix only if two
  // different sources would land on the same file name.
  const destBySource = new Map<string, string>()
  const usedNames = new Set<string>()
  for (const source of new Set(sourceBySrc.values())) {
    const base = source.slice(source.lastIndexOf('/') + 1)
    let name = base
    for (let n = 2; usedNames.has(name); n++) name = `${n}-${base}`
    usedNames.add(name)
    destBySource.set(source, `outlines/${newProjectId}/${name}`)
  }

  const copied = new Map<string, string>() // source → dest, successes only
  await Promise.all(
    [...destBySource].map(async ([source, dest]) => {
      const { error: copyErr } = await supabase.storage.from('attachments').copy(source, dest)
      if (copyErr) console.error('Duplicate outline image copy error:', source, copyErr)
      else copied.set(source, dest)
    })
  )
  if (copied.size === 0) return

  const { data: signed, error: signErr } = await supabase.storage
    .from('attachments')
    .createSignedUrls([...copied.values()], OUTLINE_IMAGE_URL_TTL)
  if (signErr) {
    console.error('Duplicate outline image signing error:', signErr)
    return
  }
  const urlByDest = new Map(
    (signed ?? []).flatMap((entry) => (entry.path && entry.signedUrl ? [[entry.path, entry.signedUrl] as const] : []))
  )

  const srcMap = new Map<string, string>()
  for (const [src, source] of sourceBySrc) {
    const dest = copied.get(source)
    const url = dest ? urlByDest.get(dest) : undefined
    if (url) srcMap.set(src, url)
  }
  if (srcMap.size === 0) return

  await Promise.all(
    outlines.map(async (outline) => {
      if (!rewriteImageSrcs(outline.content, srcMap)) return
      const { error: updateErr } = await supabase
        .from('outlines')
        .update({ content: outline.content } as never)
        .eq('id', outline.id)
      if (updateErr) console.error('Duplicate outline image update error:', outline.id, updateErr)
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
  // Outlines are only copied in full mode.
  if (mode === 'full') {
    try {
      await unshareDuplicatedOutlineImages(supabase, newProjectId)
    } catch (err) {
      console.error('Duplicate outline image unsharing error:', err)
    }
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

// Every top-level attachments folder that holds a project's files, each laid
// out as {folder}/{projectId}/….
const PROJECT_FILE_FOLDERS = ['projects', 'places', 'outlines', 'panels', 'chapters'] as const

// Attachment paths the caller's *other* projects still use: covers, place
// covers and outline images. Old duplicates and failed copies can still
// point into another project's folders, so deleting a project mustn't remove
// those. Old chapter descriptions are ignored — nothing displays them. RLS
// scopes every query to the caller's own projects. Null if any lookup fails,
// so the caller can keep everything rather than guess.
async function pathsUsedByOtherProjects(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string
): Promise<Set<string> | null> {
  const [coversRes, placesRes, outlinesRes] = await Promise.all([
    supabase.from('projects').select('cover_image_url').neq('id', projectId).not('cover_image_url', 'is', null),
    supabase.from('places').select('image_url').neq('project_id', projectId).not('image_url', 'is', null),
    supabase.from('outlines').select('content').neq('project_id', projectId),
  ])
  const failed = [coversRes, placesRes, outlinesRes].find((res) => res.error)
  if (failed?.error) {
    console.error('Project file reference check error:', failed.error)
    return null
  }

  const used = new Set<string>()
  for (const row of (coversRes.data ?? []) as { cover_image_url: string }[]) used.add(row.cover_image_url)
  for (const row of (placesRes.data ?? []) as { image_url: string }[]) used.add(row.image_url)
  for (const row of (outlinesRes.data ?? []) as { content: TiptapNode }[]) {
    const srcs = new Set<string>()
    collectImageSrcs(row.content, srcs)
    for (const src of srcs) {
      const path = attachmentPathFromSignedUrl(src)
      if (path) used.add(path)
    }
  }
  return used
}

// Removes a project's files from every folder, except any another project
// still uses. Must run while the project row still exists: the attachments
// policies only allow listing and deleting a project's files then. Storage
// errors are logged, never returned.
async function removeProjectFiles(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  const paths: string[] = []
  for (const folder of PROJECT_FILE_FOLDERS) {
    const prefix = `${folder}/${projectId}`
    try {
      paths.push(...(await listFilesRecursive(supabase, prefix)))
    } catch (err) {
      console.error('Project file listing error:', prefix, err)
    }
  }
  if (paths.length === 0) return

  const used = await pathsUsedByOtherProjects(supabase, projectId)
  if (!used) return
  await removeInBatches(supabase, paths.filter((path) => !used.has(path)), 'Project')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  // Files before the row — after it's gone, the Storage policies no longer
  // allow listing or deleting them. Only touched once the project is
  // confirmed to exist and be the caller's (RLS on projects returns only
  // their own). If the row delete below then fails, the project stays but
  // without its own images; retrying the delete still works.
  const { data: owned } = await supabase.from('projects').select('id').eq('id', id).maybeSingle()
  if (owned) {
    try {
      await removeProjectFiles(supabase, id)
    } catch (err) {
      console.error('Project file cleanup error:', err)
    }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
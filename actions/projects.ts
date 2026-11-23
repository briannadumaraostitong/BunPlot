'use server'

import { createClient } from '@/lib/supabase/server'
import { RATE_LIMIT_MESSAGES } from '@/lib/rateLimit'
import { revalidatePath } from 'next/cache'
import { attachmentPathFromSignedUrl, listFilesRecursive, removeInBatches } from '@/lib/storage/attachments'
import { EXPORTS_BUCKET, EXPORTS_FOLDER } from '@/lib/storage/exports'
import { forEachWithConcurrency } from '@/lib/export/concurrency'
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

// Duplicate file handling. duplicate_project (SQL) copies file references
// as-is — cover_image_url, and in full mode places.image_url, panels.image_url
// and image srcs inside outline content — so straight after the RPC the copy
// points at the original's files. SQL can't copy Storage objects, so the
// steps below give the copy its own: each file is copied under the new
// project's folders and the reference repointed. A failed cover or panel
// copy sets that reference to NULL; a failed outline-image copy keeps the
// shared src (see unshareDuplicatedOutlineImages). Either way the duplicate
// itself still succeeds.
//
// Sharing can therefore still exist — from failed outline-image copies and
// from duplicates made before this copying existed — so deleteProject checks
// the user's other projects for references before removing any file. Old
// chapter descriptions stay shared on purpose: nothing displays them.

// Copies one attachments file under destPrefix, keeping its file name.
// Returns the new path, or null (logged) if the copy failed.
async function copyAttachmentFile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fromPath: string,
  destPrefix: string
): Promise<string | null> {
  const toPath = `${destPrefix}/${fromPath.slice(fromPath.lastIndexOf('/') + 1)}`
  const { error } = await supabase.storage.from('attachments').copy(fromPath, toPath)
  if (error) {
    console.error('Duplicate file copy error:', fromPath, error)
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
    const newPath = sharedCover ? await copyAttachmentFile(supabase, sharedCover, `projects/${newProjectId}`) : null
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
      const newPath = await copyAttachmentFile(supabase, place.image_url, `places/${newProjectId}/${place.id}`)
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

  // duplicate_project takes its own rate-limit slot (supabase/schema.sql)
  // and raises 'rate_limited' when there's none left.
  if (error) return { error: error.message === 'rate_limited' ? RATE_LIMIT_MESSAGES.duplicate_project : error.message }

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
    try {
      await unshareDuplicatedPanelImages(supabase, newProjectId)
    } catch (err) {
      console.error('Duplicate panel image unsharing error:', err)
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

// More panels than covers per project, so copies run a few at a time rather
// than all at once.
const PANEL_COPY_CONCURRENCY = 8

// duplicate_project copies panels (full mode) with image_url as-is, so each
// copied panel — uploaded image or sketch — points at the original's file.
// Same approach as unshareDuplicatedCovers: copy to the copy's own
// panels/{project}/{chapter}/{panel}/ path and repoint; a failed copy sets
// image_url to NULL (the panel keeps its caption) rather than leaving it
// shared, which is what lets chapter/project delete cleanup treat panel
// files as never shared.
async function unshareDuplicatedPanelImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  newProjectId: string
) {
  const { data, error } = await supabase
    .from('panels')
    .select('id, chapter_id, image_url')
    .eq('project_id', newProjectId)
    .not('image_url', 'is', null)
  if (error) {
    // Can't tell which are shared, so unshare them all.
    console.error('Duplicate panel lookup error:', error)
    const { error: resetErr } = await supabase
      .from('panels')
      .update({ image_url: null } as never)
      .eq('project_id', newProjectId)
    if (resetErr) console.error('Duplicate panel image reset error:', resetErr)
    return
  }

  const panels = (data ?? []) as { id: string; chapter_id: string; image_url: string }[]
  await forEachWithConcurrency(panels, PANEL_COPY_CONCURRENCY, async (panel) => {
    const newPath = await copyAttachmentFile(
      supabase,
      panel.image_url,
      `panels/${newProjectId}/${panel.chapter_id}/${panel.id}`
    )
    const { error: updateErr } = await supabase
      .from('panels')
      .update({ image_url: newPath } as never)
      .eq('id', panel.id)
    if (updateErr) console.error('Duplicate panel image update error:', panel.id, updateErr)
  })
}

// Every top-level attachments folder that holds a project's files, each laid
// out as {folder}/{projectId}/…. Finished exports are in their own bucket
// (lib/storage/exports), cleared separately.
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
// still uses, and any exports not yet downloaded. Must run while the project
// row still exists: the storage policies only allow listing and deleting a
// project's files then. Storage errors are logged, never returned.
async function removeProjectFiles(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string) {
  // Exports belong to this project alone, so no reference check.
  const exportsPrefix = `${EXPORTS_FOLDER}/${projectId}`
  try {
    const exportPaths = await listFilesRecursive(supabase, exportsPrefix, EXPORTS_BUCKET)
    await removeInBatches(supabase, exportPaths, 'Project export', EXPORTS_BUCKET)
  } catch (err) {
    console.error('Project file listing error:', `${EXPORTS_BUCKET}/${exportsPrefix}`, err)
  }

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
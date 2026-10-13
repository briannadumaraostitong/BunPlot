'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { listFilesRecursive, removeInBatches } from '@/lib/storage/attachments'
import type { Chapter, ChapterLink } from '@/types/database'

// What to do with a chapter's events when deleting it. Required whenever the
// chapter has any — see the guard in deleteChapter.
export type DeleteChapterEventsAction =
  | { type: 'move'; targetChapterId: string }
  | { type: 'delete' }

// Removes a deleted chapter's files: its panels' images and sketches (one
// subfolder per panel) and any images from the old chapter-description editor.
// Same contract as deletePanel: runs after the rows are gone, and Storage
// errors are logged, never returned, so a cleanup hiccup can't fail a delete
// that already happened. Works under the attachments policies because they
// check the project in the path, which still exists. Panel files are never
// shared: duplicates get their own copies (duplicateProject), and a failed
// copy clears the copy's image_url instead of sharing. chapters/ files can be
// referenced by a full-mode duplicate's copied description, but nothing
// displays chapter descriptions any more.
async function removeChapterFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  chapterId: string
) {
  for (const prefix of [`panels/${projectId}/${chapterId}`, `chapters/${projectId}/${chapterId}`]) {
    let paths: string[]
    try {
      paths = await listFilesRecursive(supabase, prefix)
    } catch (err) {
      console.error('Chapter file listing error:', prefix, err)
      continue
    }
    await removeInBatches(supabase, paths, 'Chapter')
  }
}

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
  updates: Partial<{
    title: string
    visible: boolean
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('chapters').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteChapter(
  id: string,
  projectId: string,
  eventsAction?: DeleteChapterEventsAction
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()

  // events.chapter_id is ON DELETE SET NULL, so deleting a chapter that still
  // has events would silently leave them with no chapter — invisible in the
  // Grid. Deal with them explicitly first; refuse if the caller didn't say how.
  // Not a transaction: each step only runs if the previous one succeeded, so
  // the worst partial failure leaves events moved/deleted and the chapter
  // still present, which is safe to retry.
  const { data: chapterEventRows, error: eventsError } = await supabase
    .from('events')
    .select('id, layer_id, position')
    .eq('chapter_id', id)
    .order('position')
  if (eventsError) return { error: eventsError.message }
  const chapterEvents = (chapterEventRows ?? []) as { id: string; layer_id: string; position: number }[]

  if (chapterEvents.length > 0) {
    if (!eventsAction) {
      return { error: 'This chapter still has events. Choose whether to move or delete them first.' }
    }

    if (eventsAction.type === 'move') {
      const targetId = eventsAction.targetChapterId
      if (targetId === id) return { error: 'Choose a different chapter to move events to.' }

      // RLS only checks ownership, so also confirm the target is in this project.
      const { data: target, error: targetError } = await supabase
        .from('chapters')
        .select('id')
        .eq('id', targetId)
        .eq('project_id', projectId)
        .maybeSingle()
      if (targetError) return { error: targetError.message }
      if (!target) return { error: 'Destination chapter not found.' }

      const { data: targetEventRows, error: targetEventsError } = await supabase
        .from('events')
        .select('layer_id, position')
        .eq('chapter_id', targetId)
      if (targetEventsError) return { error: targetEventsError.message }

      // Per layer (each layer is its own cell in a chapter column): continue
      // after the target cell's last position, keeping the moved events'
      // relative order (chapterEvents is already sorted by position).
      const nextPositionByLayer = new Map<string, number>()
      for (const e of (targetEventRows ?? []) as { layer_id: string; position: number }[]) {
        nextPositionByLayer.set(e.layer_id, Math.max(nextPositionByLayer.get(e.layer_id) ?? 0, e.position + 1))
      }
      const moves = chapterEvents.map((e) => {
        const position = nextPositionByLayer.get(e.layer_id) ?? 0
        nextPositionByLayer.set(e.layer_id, position + 1)
        return { id: e.id, position }
      })

      const results = await Promise.all(
        moves.map((m) =>
          supabase
            .from('events')
            .update({ chapter_id: targetId, position: m.position } as never)
            .eq('id', m.id)
        )
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) return { error: failed.error.message }
    } else {
      // event_characters / event_places / event_dependencies cascade.
      const { error: deleteEventsError } = await supabase.from('events').delete().eq('chapter_id', id)
      if (deleteEventsError) return { error: deleteEventsError.message }
    }
  }

  // panels.chapter_id cascades, removing the panel rows; their files are
  // cleaned up below. project_id comes from the row actually deleted, so the
  // cleanup can't be pointed at the wrong folder, and nothing is touched if
  // RLS deleted nothing.
  const { data: deletedRows, error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', id)
    .select('project_id')

  if (error) return { error: error.message }

  const deleted = (deletedRows ?? [])[0] as { project_id: string } | undefined
  if (deleted) {
    try {
      await removeChapterFiles(supabase, deleted.project_id, id)
    } catch (err) {
      console.error('Chapter file cleanup error:', err)
    }
  }

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

// ── Chapter Links ("continues from") ─────────────────────────

export interface ChapterLinkWithSource {
  id: string
  continues_from: Chapter
}

export async function getChapterLinks(chapterId: string): Promise<ChapterLinkWithSource[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chapter_links')
    .select('id, continues_from:chapters!continues_from_chapter_id(*)')
    .eq('chapter_id', chapterId)

  if (error) {
    console.error('Get chapter links error:', error)
    return []
  }

  return ((data ?? []) as { id: string; continues_from: Chapter | null }[])
    .filter((row): row is { id: string; continues_from: Chapter } => row.continues_from !== null)
}

export async function addChapterLink(
  chapterId: string,
  continuesFromChapterId: string,
  projectId: string
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chapter_links')
    .insert({
      project_id: projectId,
      chapter_id: chapterId,
      continues_from_chapter_id: continuesFromChapterId,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return data as ChapterLink
}

export async function removeChapterLink(linkId: string, projectId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('chapter_links').delete().eq('id', linkId)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
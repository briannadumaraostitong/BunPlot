'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Chapter, ChapterLink } from '@/types/database'

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
    description: Record<string, unknown>
    pov_character_id: string | null
    visible: boolean
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('chapters').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteChapter(id: string, projectId: string) {
  const supabase = await createClient()
  // panels.chapter_id cascades on delete, but that only removes the DB rows —
  // their Storage objects under attachments/panels/{projectId}/{id}/ are orphaned.
  // No cleanup call here yet; add a storage.list()+remove() pass over that prefix
  // when panels ship.
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
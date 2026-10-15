'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Panel } from '@/types/database'

// Cover images live in the private 'attachments' bucket, same as Places —
// see PlaceWithCover in actions/places.ts. Recomputed on every
// getPanelsForChapter() call, so a short TTL is fine.
const COVER_SIGNED_URL_TTL = 60 * 60 * 24 // 24h

export interface PanelWithCover extends Panel {
  cover_url: string | null
}

export type ActionResult = { error: string } | { success: true }

async function withPanelCoverUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  panels: Panel[]
): Promise<PanelWithCover[]> {
  const paths = panels
    .map((panel) => panel.image_url)
    .filter((path): path is string => path !== null)

  if (paths.length === 0) {
    return panels.map((panel) => ({ ...panel, cover_url: null }))
  }

  const { data } = await supabase.storage
    .from('attachments')
    .createSignedUrls(paths, COVER_SIGNED_URL_TTL)

  const urlByPath = new Map((data ?? []).map((entry) => [entry.path, entry.signedUrl]))

  return panels.map((panel) => ({
    ...panel,
    cover_url: (panel.image_url && urlByPath.get(panel.image_url)) ?? null,
  }))
}

// ── Panels ──────────────────────────────────────────────────

export async function getPanelsForChapter(
  chapterId: string
): Promise<{ error: string } | PanelWithCover[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('panels')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('position', { ascending: true })

  if (error) return { error: error.message }
  return withPanelCoverUrls(supabase, (data ?? []) as Panel[])
}

export async function createPanel(
  projectId: string,
  chapterId: string,
  position: number,
  caption?: string
): Promise<{ error: string } | PanelWithCover> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('panels')
    .insert({
      project_id: projectId,
      chapter_id: chapterId,
      position,
      caption: caption ?? null,
    } as never)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { ...(data as Panel), cover_url: null }
}

// Signs a single path, for panels arriving over realtime from another client.
// getPanelsForChapter would re-sign every panel in the chapter, changing every
// <img src> and forcing the whole grid to re-download.
export async function signPanelImage(path: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('attachments')
    .createSignedUrl(path, COVER_SIGNED_URL_TTL)
  return data?.signedUrl ?? null
}

export async function updatePanel(
  id: string,
  projectId: string,
  updates: Partial<{
    caption: string | null
    position: number
    image_url: string | null
  }>
): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase.from('panels').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deletePanel(id: string, projectId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('panels')
    .select('image_url')
    .eq('id', id)
    .single()

  const panel = data as { image_url: string | null } | null

  const { error } = await supabase.from('panels').delete().eq('id', id)
  if (error) return { error: error.message }

  if (panel?.image_url) {
    const { error: removeErr } = await supabase.storage.from('attachments').remove([panel.image_url])
    if (removeErr) console.error('Panel image cleanup error:', removeErr)
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function reorderPanels(projectId: string, orderedIds: string[]): Promise<ActionResult> {
  const supabase = await createClient()
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('panels')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
  // Each row is its own update; report the first failure instead of
  // claiming the whole order saved.
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  return { success: true }
}

// Count only — for DeleteChapterDialog's "N storyboard panels will also be
// deleted" note, where getPanelsForChapter's per-image URL signing would be
// wasted work. Returns null (not 0) on error, so a failed query can't pass
// for "this chapter has no panels".
export async function getPanelCountForChapter(chapterId: string): Promise<number | null> {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('panels')
    .select('id', { count: 'exact', head: true })
    .eq('chapter_id', chapterId)

  if (error) {
    console.error('Get panel count error:', error)
    return null
  }
  return count ?? 0
}

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

export async function getPanelsForChapter(chapterId: string): Promise<PanelWithCover[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('panels')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('position', { ascending: true })

  if (error) {
    console.error('Get panels error:', error)
    return []
  }
  return withPanelCoverUrls(supabase, (data ?? []) as Panel[])
}

export async function createPanel(
  projectId: string,
  chapterId: string,
  position: number,
  caption?: string
) {
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

export async function updatePanel(
  id: string,
  projectId: string,
  updates: Partial<{
    caption: string | null
    position: number
    image_url: string | null
  }>
) {
  const supabase = await createClient()
  const { error } = await supabase.from('panels').update(updates as never).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deletePanel(id: string, projectId: string) {
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

export async function reorderPanels(projectId: string, orderedIds: string[]) {
  const supabase = await createClient()
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from('panels')
        .update({ position: index } as never)
        .eq('id', id)
    )
  )
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

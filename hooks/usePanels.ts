'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getPanelsForChapter,
  createPanel,
  updatePanel,
  deletePanel,
  signPanelImage,
  type PanelWithCover,
  type ActionResult,
} from '@/actions/panels'
import type { Panel } from '@/types/database'

export function usePanels(projectId: string, chapterId: string, initial: PanelWithCover[] = []) {
  const [panels, setPanels] = useState<PanelWithCover[]>(initial)
  // Gates the first load of a chapter only. Realtime changes are applied in
  // place below, so they must never flip this back on — doing so unmounts the
  // whole grid behind PanelGrid's spinner, which reads as a page reload.
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Lets the realtime handler compare an incoming row against what we already
  // hold without taking a dependency on `panels`, which would tear down and
  // re-subscribe the channel on every change.
  const panelsRef = useRef(panels)
  useEffect(() => {
    panelsRef.current = panels
  }, [panels])

  // Background refetch — deliberately leaves `loading` alone.
  const refresh = useCallback(async () => {
    const data = await getPanelsForChapter(chapterId)
    setPanels(data)
  }, [chapterId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const data = await getPanelsForChapter(chapterId)
      if (cancelled) return
      setPanels(data)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [chapterId])

  useEffect(() => {
    const channel = supabase
      .channel(`panels:${chapterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'panels',
          filter: `chapter_id=eq.${chapterId}`,
        },
        async (payload) => {
          // Applied in place rather than refetching the chapter. A refetch
          // re-signs every cover URL — changing every <img src> and forcing a
          // re-download — and a drag would fire one per reordered row. Merging
          // in place also makes this client's own echo a no-op instead of a
          // visible reload.
          if (payload.eventType === 'DELETE') {
            // Relies on panels being REPLICA IDENTITY FULL; under the default
            // the filter above never matches a DELETE at all.
            const { id } = payload.old as Partial<Panel>
            if (id) setPanels((prev) => prev.filter((p) => p.id !== id))
            return
          }

          const row = payload.new as Panel
          const existing = panelsRef.current.find((p) => p.id === row.id)
          // cover_url is a signed URL derived from image_url, not a column, so
          // it survives anything that leaves image_url alone — which is what
          // keeps caption edits and drags from re-minting every image.
          const imageChanged = row.image_url !== (existing?.image_url ?? null)

          setPanels((prev) => {
            const merged = prev.some((p) => p.id === row.id)
              ? prev.map((p) =>
                  p.id === row.id
                    ? { ...p, ...row, cover_url: imageChanged ? null : p.cover_url }
                    : p
                )
              : [...prev, { ...row, cover_url: null }]
            return merged.sort((a, b) => a.position - b.position)
          })

          if (row.image_url && imageChanged) {
            const signed = await signPanelImage(row.image_url)
            if (signed) {
              setPanels((prev) =>
                prev.map((p) => (p.id === row.id ? { ...p, cover_url: signed } : p))
              )
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chapterId, supabase])

  async function addPanel(caption?: string): Promise<{ error: string } | PanelWithCover> {
    const nextPosition = panels.length > 0 ? Math.max(...panels.map((p) => p.position)) + 1 : 0
    const result = await createPanel(projectId, chapterId, nextPosition, caption)
    if ('error' in result) return result
    setPanels((prev) => [...prev, result])
    return result
  }

  async function editPanel(
    id: string,
    updates: Parameters<typeof updatePanel>[2]
  ): Promise<ActionResult> {
    setPanels((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
    return updatePanel(id, projectId, updates)
  }

  async function removePanel(id: string): Promise<ActionResult> {
    setPanels((prev) => prev.filter((p) => p.id !== id))
    return deletePanel(id, projectId)
  }

  // cover_url is a signed URL, not a persisted column — the caller (the sketch
  // save flow) already computed it client-side, same as CoverImageField does
  // for Places, so it's applied optimistically here alongside the real
  // image_url persist.
  async function setPanelImage(id: string, imageUrl: string, coverUrl: string): Promise<ActionResult> {
    setPanels((prev) =>
      prev.map((p) => (p.id === id ? { ...p, image_url: imageUrl, cover_url: coverUrl } : p))
    )
    return updatePanel(id, projectId, { image_url: imageUrl })
  }

  function reorder(from: number, to: number) {
    setPanels((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((p, i) => ({ ...p, position: i }))
    })
  }

  return { panels, setPanels, loading, refresh, addPanel, editPanel, removePanel, setPanelImage, reorder }
}

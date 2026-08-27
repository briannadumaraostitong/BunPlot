'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getPanelsForChapter,
  createPanel,
  updatePanel,
  deletePanel,
  type PanelWithCover,
  type ActionResult,
} from '@/actions/panels'

export function usePanels(projectId: string, chapterId: string, initial: PanelWithCover[] = []) {
  const [panels, setPanels] = useState<PanelWithCover[]>(initial)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await getPanelsForChapter(chapterId)
    setPanels(data)
    setLoading(false)
  }, [chapterId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await refresh()
    })()
    return () => {
      cancelled = true
    }
  }, [refresh])

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
        () => { refresh() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chapterId, refresh, supabase])

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

  function reorder(from: number, to: number) {
    setPanels((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((p, i) => ({ ...p, position: i }))
    })
  }

  return { panels, setPanels, loading, refresh, addPanel, editPanel, removePanel, reorder }
}

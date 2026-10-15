'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dismissError, notifyError } from '@/lib/notify'
import type { Layer } from '@/types/database'

// Background refresh (realtime and after edits elsewhere on the page): on
// failure, keep what's showing and toast once (fixed id), cleared by the next
// successful refresh.
const REFRESH_TOAST_ID = 'layers-refresh'

export function useLayers(projectId: string, initial: Layer[] = []) {
  const [layers, setLayers] = useState<Layer[]>(initial)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('layers')
      .select('*')
      .eq('project_id', projectId)
      .order('position')
    if (error) {
      notifyError("Couldn't refresh layers. Reload to see the latest.", error, { id: REFRESH_TOAST_ID })
      return
    }
    dismissError(REFRESH_TOAST_ID)
    setLayers(data as Layer[])
  }, [projectId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`layers:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'layers',
          filter: `project_id=eq.${projectId}`,
        },
        () => { refresh() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, refresh, supabase])

  function toggleVisibility(id: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    )
  }

  function reorder(from: number, to: number) {
    setLayers((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((l, i) => ({ ...l, position: i }))
    })
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id))
  }

  function renameLayer(id: string, newName: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, name: newName } : l))
    )
  }

  function colorLayer(id: string, color: string) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, color } : l))
    )
  }

  return { layers, setLayers, refresh, toggleVisibility, reorder, removeLayer, renameLayer, colorLayer }
}
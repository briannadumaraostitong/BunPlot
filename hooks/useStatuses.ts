'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { dismissError, notifyError } from '@/lib/notify'
import type { Status } from '@/types/database'

// Background refresh (realtime and after edits elsewhere on the page): on
// failure, keep what's showing and toast once (fixed id), cleared by the next
// successful refresh.
const REFRESH_TOAST_ID = 'statuses-refresh'

export function useStatuses(projectId: string, initial: Status[] = []) {
  const [statuses, setStatuses] = useState<Status[]>(initial)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('statuses')
      .select('*')
      .eq('project_id', projectId)
      .order('position')
    if (error) {
      notifyError("Couldn't refresh statuses. Reload to see the latest.", error, { id: REFRESH_TOAST_ID })
      return
    }
    dismissError(REFRESH_TOAST_ID)
    setStatuses(data as Status[])
  }, [projectId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`statuses:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'statuses',
          filter: `project_id=eq.${projectId}`,
        },
        () => { refresh() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, refresh, supabase])

  function reorder(from: number, to: number) {
    setStatuses((prev) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next.map((s, i) => ({ ...s, position: i }))
    })
  }

  function removeStatus(id: string) {
    setStatuses((prev) => prev.filter((s) => s.id !== id))
  }

  function renameStatus(id: string, newName: string) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    )
  }

  function colorStatus(id: string, color: string) {
    setStatuses((prev) =>
      prev.map((s) => (s.id === id ? { ...s, color } : s))
    )
  }

  function setDefaultLocal(id: string) {
    setStatuses((prev) =>
      prev.map((s) => ({ ...s, is_default: s.id === id }))
    )
  }

  return { statuses, setStatuses, refresh, reorder, removeStatus, renameStatus, colorStatus, setDefaultLocal }
}

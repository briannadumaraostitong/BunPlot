'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Chapter } from '@/types/database'

export function useChapters(projectId: string, initial: Chapter[] = []) {
  const [chapters, setChapters] = useState<Chapter[]>(initial)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('chapters')
      .select('*')
      .eq('project_id', projectId)
      .order('position')
    if (data) setChapters(data as Chapter[])
  }, [projectId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`chapters:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chapters',
          filter: `project_id=eq.${projectId}`,
        },
        () => { refresh() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, refresh, supabase])

  function removeChapter(id: string) {
    setChapters((prev) => prev.filter((c) => c.id !== id))
  }

  function renameChapter(id: string, newTitle: string) {
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    )
  }

  // Optimistic counterpart to updateChapter, matching how PlaceDetailPanel
  // pairs onUpdated with updatePlace — the realtime subscription above would
  // eventually catch up, but the modal shouldn't wait on a round trip to show
  // what was just saved.
  function updateChapterLocal(id: string, updates: Partial<Chapter>) {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  return { chapters, setChapters, refresh, removeChapter, renameChapter, updateChapterLocal }
}
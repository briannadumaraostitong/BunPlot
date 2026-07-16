'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/types/database'

export function useEvents(projectId: string, initial: Event[] = []) {
  const [events, setEvents] = useState<Event[]>(initial)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('project_id', projectId)
      .order('position')
    if (data) setEvents(data as Event[])
  }, [projectId, supabase])

  useEffect(() => {
    const channel = supabase
      .channel(`events:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `project_id=eq.${projectId}`,
        },
        () => refresh()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId, refresh, supabase])

  function moveEventToCell(
    eventId: string,
    chapterId: string,
    layerId: string,
    orderedIdsInTargetCell: string[]
  ) {
    setEvents((prev) => {
      const positionById = new Map(orderedIdsInTargetCell.map((id, index) => [id, index]))
      return prev.map((e) => {
        if (e.id === eventId) {
          return {
            ...e,
            chapter_id: chapterId,
            layer_id: layerId,
            position: positionById.get(eventId) ?? e.position,
          }
        }
        return positionById.has(e.id) ? { ...e, position: positionById.get(e.id)! } : e
      })
    })
  }

  function eventsForLayer(layerId: string) {
    return events
      .filter((e) => e.layer_id === layerId)
      .sort((a, b) => a.position - b.position)
  }

  return { events, setEvents, refresh, moveEventToCell, eventsForLayer }
}
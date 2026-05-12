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

  function moveEventOptimistic(id: string, newPosition: number, newLayerId?: string) {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, position: newPosition, layer_id: newLayerId ?? e.layer_id }
          : e
      )
    )
  }

  function eventsForLayer(layerId: string) {
    return events
      .filter((e) => e.layer_id === layerId)
      .sort((a, b) => a.position - b.position)
  }

  return { events, setEvents, refresh, moveEventOptimistic, eventsForLayer }
}
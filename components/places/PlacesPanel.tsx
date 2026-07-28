'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PlaceSidebar } from './PlaceSidebar'
import { PlaceGrid } from './PlaceGrid'
import { PlaceDetailPanel } from './PlaceDetailPanel'
import { EventModal } from '@/components/events/EventModal'
import { useEvents } from '@/hooks/useEvents'
import { useChapters } from '@/hooks/useChapters'
import { useLayers } from '@/hooks/useLayers'
import { getPlaces, getEventPlaceLinks } from '@/actions/places'
import { getCharacters } from '@/actions/characters'
import type { Layer, Event, Chapter, PlaceType, Character } from '@/types/database'
import type { PlaceWithCover, EventPlaceLink } from '@/actions/places'

interface PlacesPanelProps {
  projectId: string
  initialEvents: Event[]
  initialLayers: Layer[]
  initialChapters: Chapter[]
}

export function PlacesPanel({
  projectId,
  initialEvents,
  initialLayers,
  initialChapters,
}: PlacesPanelProps) {
  const [loading, setLoading] = useState(true)
  const [places, setPlaces] = useState<PlaceWithCover[]>([])
  const [eventPlaceLinks, setEventPlaceLinks] = useState<EventPlaceLink[]>([])
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PlaceType | 'all'>('all')

  const { events, refresh: refreshEvents } = useEvents(projectId, initialEvents)
  const { chapters } = useChapters(projectId, initialChapters)
  const { layers } = useLayers(projectId, initialLayers)

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [placesData, linksData] = await Promise.all([
        getPlaces(projectId),
        getEventPlaceLinks(projectId),
      ])
      if (cancelled) return
      setPlaces(placesData)
      setEventPlaceLinks(linksData)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getCharacters(projectId)
      if (!cancelled) setAllCharacters(data)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const filteredPlaces = useMemo(() => {
    const q = search.trim().toLowerCase()
    return places.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [places, search, typeFilter])

  // Chapters a place "appears in" are derived: events linked to the place via
  // event_places, grouped by each event's chapter. Not a stored relationship.
  const chaptersByPlaceId = useMemo(() => {
    const map = new Map<string, Chapter[]>()
    for (const link of eventPlaceLinks) {
      const event = events.find((e) => e.id === link.event_id)
      if (!event?.chapter_id) continue
      const chapter = chapters.find((c) => c.id === event.chapter_id)
      if (!chapter) continue
      const list = map.get(link.place_id) ?? []
      if (!list.some((c) => c.id === chapter.id)) list.push(chapter)
      map.set(link.place_id, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.position - b.position)
    return map
  }, [eventPlaceLinks, events, chapters])

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) ?? null

  const connectedEvents = useMemo(() => {
    if (!selectedPlaceId) return []
    return eventPlaceLinks
      .filter((l) => l.place_id === selectedPlaceId)
      .map((l) => events.find((e) => e.id === l.event_id))
      .filter((e): e is Event => !!e)
      .map((event) => ({ event, chapter: chapters.find((c) => c.id === event.chapter_id) ?? null }))
  }, [selectedPlaceId, eventPlaceLinks, events, chapters])

  function handlePlaceUpdated(id: string, updates: Partial<PlaceWithCover>) {
    setPlaces((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  function handleSelectEvent(event: Event) {
    setSelectedEvent(event)
    setModalOpen(true)
  }

  const selectedEventLayer = selectedEvent
    ? (layers.find((l) => l.id === selectedEvent.layer_id) ?? null)
    : null

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      <PlaceSidebar
        projectId={projectId}
        places={filteredPlaces}
        totalCount={places.length}
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        selectedPlaceId={selectedPlaceId}
        onSelect={setSelectedPlaceId}
        onPlaceAdded={(place) => {
          setPlaces((prev) => [...prev, place])
          setSelectedPlaceId(place.id)
        }}
        onPlaceColorChanged={(id, color) => handlePlaceUpdated(id, { color })}
        onPlaceDeleted={(id) => {
          setPlaces((prev) => prev.filter((p) => p.id !== id))
          setSelectedPlaceId((current) => (current === id ? null : current))
        }}
      />

      <div className="relative flex-1 min-w-0 overflow-hidden">
        <PlaceGrid
          places={filteredPlaces}
          hasAnyPlaces={places.length > 0}
          chaptersByPlaceId={chaptersByPlaceId}
          selectedPlaceId={selectedPlaceId}
          onSelect={setSelectedPlaceId}
        />

        <PlaceDetailPanel
          place={selectedPlace}
          connectedEvents={connectedEvents}
          open={selectedPlaceId !== null}
          onClose={() => setSelectedPlaceId(null)}
          onUpdated={handlePlaceUpdated}
          onSelectEvent={handleSelectEvent}
        />
      </div>

      <EventModal
        event={selectedEvent}
        layer={selectedEventLayer}
        chapters={chapters}
        layers={layers}
        allPlaces={places}
        allCharacters={allCharacters}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedEvent(null)
        }}
        onUpdated={refreshEvents}
      />
    </div>
  )
}

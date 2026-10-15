'use client'

import { useEffect, useMemo, useState } from 'react'
import { pruneBackups } from '@/lib/editorBackup'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarRowSkeleton } from '@/components/ui/sidebar-skeleton-row'
import { LoadError } from '@/components/ui/load-error'
import { PlaceSidebar } from './PlaceSidebar'
import { PlaceGrid } from './PlaceGrid'
import { PlaceDetailPanel } from './PlaceDetailPanel'
import { EventModal } from '@/components/events/EventModal'
import { useEvents } from '@/hooks/useEvents'
import { useChapters } from '@/hooks/useChapters'
import { useLayers } from '@/hooks/useLayers'
import { useStatuses } from '@/hooks/useStatuses'
import { getPlaces, getEventPlaceLinks } from '@/actions/places'
import { waitForPendingPlaceSaves } from './pendingPlaceSaves'
import { getCharacters } from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import type { Layer, Event, Chapter, PlaceType, Character, Status } from '@/types/database'
import type { PlaceWithCover, EventPlaceLink } from '@/actions/places'

interface PlacesPanelProps {
  projectId: string
  initialEvents: Event[]
  initialLayers: Layer[]
  initialChapters: Chapter[]
  initialStatuses: Status[]
  initialSelectedPlaceId?: string
}

export function PlacesPanel({
  projectId,
  initialEvents,
  initialLayers,
  initialChapters,
  initialStatuses,
  initialSelectedPlaceId,
}: PlacesPanelProps) {
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  // Bumped by Retry to re-run the load effect.
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [places, setPlaces] = useState<PlaceWithCover[]>([])
  const [eventPlaceLinks, setEventPlaceLinks] = useState<EventPlaceLink[]>([])
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [allCharactersFailed, setAllCharactersFailed] = useState(false)
  // Bumped by the character picker's Retry.
  const [charactersAttempt, setCharactersAttempt] = useState(0)
  // Trusts the deep-linked id until the fetch below resolves and validates
  // it against the real place list, clearing it if unmatched — same
  // failure mode fixed in CharactersPanel/TimelineCanvas: a stale/bad id
  // would otherwise open PlaceDetailPanel with open: true and place: null.
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    initialSelectedPlaceId ?? null
  )
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<PlaceType | 'all'>('all')

  const { events, refresh: refreshEvents } = useEvents(projectId, initialEvents)
  const { chapters } = useChapters(projectId, initialChapters)
  const { layers } = useLayers(projectId, initialLayers)
  const { statuses } = useStatuses(projectId, initialStatuses)

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Flush any place save still in flight from the previous mount of this
      // tab before trusting a fresh fetch — otherwise this can race an unmount
      // save and load stale (pre-save) content.
      await waitForPendingPlaceSaves()
      const [placesResult, linksResult] = await Promise.all([
        settle(getPlaces(projectId)),
        settle(getEventPlaceLinks(projectId)),
      ])
      if (cancelled) return
      // Both or neither: without the links, every place would look unused in
      // any chapter. Bail before pruning and selection-clearing, which would
      // otherwise act on lists that aren't real.
      if ('error' in placesResult || 'error' in linksResult) {
        console.error('Load places error:', 'error' in placesResult ? placesResult.error : linksResult)
        setLoadFailed(true)
        setLoading(false)
        return
      }
      const placesData = placesResult
      const linksData = linksResult
      // Skipped for a project with no places, which keeps any orphaned
      // backups until they reach 30 days.
      if (placesData.length > 0) {
        const ids = placesData.map((p) => p.id)
        pruneBackups('place-description', projectId, ids)
        pruneBackups('place-notes', projectId, ids)
      }
      setPlaces(placesData)
      setEventPlaceLinks(linksData)
      setSelectedPlaceId((current) =>
        current && !placesData.some((p) => p.id === current) ? null : current
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, loadAttempt])

  function retryLoad() {
    setLoadFailed(false)
    setLoading(true)
    setLoadAttempt((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await settle(getCharacters(projectId))
      if (cancelled) return
      const ok = reportResult(result, "Couldn't load this project's characters.", { id: 'places-characters' })
      if (ok) setAllCharacters(result)
      setAllCharactersFailed(!ok)
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, charactersAttempt])

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

  function handlePlaceLinked(eventId: string, placeId: string) {
    setEventPlaceLinks((prev) => [...prev, { event_id: eventId, place_id: placeId }])
  }

  function handlePlaceUnlinked(eventId: string, placeId: string) {
    setEventPlaceLinks((prev) =>
      prev.filter((l) => !(l.event_id === eventId && l.place_id === placeId))
    )
  }

  const selectedEventLayer = selectedEvent
    ? (layers.find((l) => l.id === selectedEvent.layer_id) ?? null)
    : null

  if (loading) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* PlaceSidebar */}
        <div className="hidden md:flex w-52 flex-col border-r border-border shrink-0">
          <div className="h-10 border-b border-border flex items-center px-2">
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="p-2 space-y-1.5 border-b border-border">
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-full rounded-md" />
          </div>
          <div className="flex-1 py-1 space-y-0.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SidebarRowSkeleton key={i} dot="dot" />
            ))}
          </div>
        </div>

        {/* PlaceGrid */}
        <div className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border bg-card">
                <Skeleton className="aspect-video w-full rounded-none" />
                <div className="p-2 space-y-1">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (loadFailed) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <LoadError thing="places" onRetry={retryLoad} />
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
        statuses={statuses}
        allPlaces={places}
        allCharacters={allCharacters}
        allCharactersFailed={allCharactersFailed}
        onRetryAllCharacters={() => setCharactersAttempt((n) => n + 1)}
        onPlaceLinked={handlePlaceLinked}
        onPlaceUnlinked={handlePlaceUnlinked}
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

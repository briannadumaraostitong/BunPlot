'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Download } from 'lucide-react'
import { LayerPanel } from '@/components/layers/LayerPanel'
import { LayerRow, EventCardPreview } from '@/components/layers/LayerRow'
import { ChapterHeader, DEFAULT_CHAPTER_WIDTH, DEFAULT_LABEL_WIDTH } from './ChapterHeader'
import { TimelineToolbar } from './TimelineToolbar'
import { TimelineFlowView } from './TimelineFlowView'
import { ExportStoryBibleDialog } from './ExportStoryBibleDialog'
import { EventModal } from '@/components/events/EventModal'
import { cn } from '@/lib/utils'
import { useLayers } from '@/hooks/useLayers'
import { useEvents } from '@/hooks/useEvents'
import { useChapters } from '@/hooks/useChapters'
import { useStatuses } from '@/hooks/useStatuses'
import { createEvent, reorderEvents, moveEventToChapter } from '@/actions/events'
import { getPlaces, getEventPlaceLinks } from '@/actions/places'
import { getCharacters, getEventCharacterLinks } from '@/actions/characters'
import type { Project, Layer, Event, Chapter, Character, Status } from '@/types/database'
import type { PlaceWithCover, EventPlaceLink } from '@/actions/places'
import type { EventCharacterLink } from '@/actions/characters'

// Mirrors stripHtml in LayerRow.tsx/ProjectCard.tsx — events store description
// as an HTML string, so search needs the same tag-stripping before matching.
function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

interface TimelineCanvasProps {
  project: Project
  initialLayers: Layer[]
  initialEvents: Event[]
  initialChapters: Chapter[]
  initialStatuses: Status[]
  initialSelectedEventId?: string
}

const TRACK_HEIGHT = 90

export function TimelineCanvas({
  project,
  initialLayers,
  initialEvents,
  initialChapters,
  initialStatuses,
  initialSelectedEventId,
}: TimelineCanvasProps) {
  const {
    layers,
    refresh: refreshLayers,
    toggleVisibility,
    reorder,
    removeLayer,
    renameLayer,
    colorLayer,
  } = useLayers(project.id, initialLayers)

  const {
    events,
    eventsForLayer,
    refresh: refreshEvents,
    moveEventToCell,
  } = useEvents(project.id, initialEvents)

  const {
    chapters,
    refresh: refreshChapters,
    removeChapter,
    renameChapter,
    updateChapterLocal,
  } = useChapters(project.id, initialChapters)

  const { statuses, reorder: reorderStatusLocal } = useStatuses(project.id, initialStatuses)

  // Lazy-init from initialEvents (already available synchronously, unlike
  // Characters/Places' async-fetched lists) so a /search deep-link opens
  // straight into the matched event's modal on first render. Both derive
  // from the same lookup so a stale/bad id can't open an empty modal —
  // modalOpen only starts true if the event was actually found.
  const initialSelectedEvent = initialSelectedEventId
    ? (initialEvents.find((e) => e.id === initialSelectedEventId) ?? null)
    : null
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(initialSelectedEvent)
  const [modalOpen, setModalOpen] = useState(initialSelectedEvent !== null)
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_WIDTH)
  const [chapterWidth, setChapterWidth] = useState(DEFAULT_CHAPTER_WIDTH)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [allPlaces, setAllPlaces] = useState<PlaceWithCover[]>([])
  const [allCharacters, setAllCharacters] = useState<Character[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'flow'>('grid')
  const [exportOpen, setExportOpen] = useState(false)
  const [eventPlaceLinks, setEventPlaceLinks] = useState<EventPlaceLink[]>([])
  const [eventCharacterLinks, setEventCharacterLinks] = useState<EventCharacterLink[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set())
  const [layerFilter, setLayerFilter] = useState<Set<string>>(new Set())
  const [characterFilter, setCharacterFilter] = useState<Set<string>>(new Set())
  const [placeFilter, setPlaceFilter] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getPlaces(project.id)
      if (!cancelled) setAllPlaces(data)
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getCharacters(project.id)
      if (!cancelled) setAllCharacters(data)
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getEventPlaceLinks(project.id)
      if (!cancelled) setEventPlaceLinks(data)
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const data = await getEventCharacterLinks(project.id)
      if (!cancelled) setEventCharacterLinks(data)
    })()
    return () => {
      cancelled = true
    }
  }, [project.id])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

  // Grouped once per link/data change, reused by every event on every
  // keystroke — avoids re-scanning the full link arrays per event per render.
  const characterLinksByEvent = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const link of eventCharacterLinks) {
      const arr = map.get(link.event_id) ?? []
      arr.push(link.character_id)
      map.set(link.event_id, arr)
    }
    return map
  }, [eventCharacterLinks])

  const placeLinksByEvent = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const link of eventPlaceLinks) {
      const arr = map.get(link.event_id) ?? []
      arr.push(link.place_id)
      map.set(link.event_id, arr)
    }
    return map
  }, [eventPlaceLinks])

  const characterNameById = useMemo(
    () => new Map(allCharacters.map((c) => [c.id, c.name])),
    [allCharacters]
  )
  const placeNameById = useMemo(() => new Map(allPlaces.map((p) => [p.id, p.name])), [allPlaces])

  const hasActiveFilter =
    search.trim() !== '' ||
    statusFilter.size > 0 ||
    layerFilter.size > 0 ||
    characterFilter.size > 0 ||
    placeFilter.size > 0

  // undefined = "no filter" so LayerRow renders every card, matching its own
  // `visibleEventIds ? filter : events` fallback — avoids building a
  // same-size Set of every event id on every render when nothing is active.
  const visibleEventIds = useMemo(() => {
    if (!hasActiveFilter) return undefined
    const q = search.trim().toLowerCase()
    const result = new Set<string>()
    for (const event of events) {
      if (statusFilter.size > 0 && !statusFilter.has(event.status_id)) continue
      if (layerFilter.size > 0 && !layerFilter.has(event.layer_id)) continue

      const eventCharacterIds = characterLinksByEvent.get(event.id) ?? []
      const eventPlaceIds = placeLinksByEvent.get(event.id) ?? []

      if (characterFilter.size > 0 && !eventCharacterIds.some((id) => characterFilter.has(id))) continue
      if (placeFilter.size > 0 && !eventPlaceIds.some((id) => placeFilter.has(id))) continue

      if (q) {
        const titleMatch = event.title.toLowerCase().includes(q)
        const descMatch = stripHtml(event.description ?? '').toLowerCase().includes(q)
        const charMatch = eventCharacterIds.some((id) =>
          (characterNameById.get(id) ?? '').toLowerCase().includes(q)
        )
        const placeMatch = eventPlaceIds.some((id) =>
          (placeNameById.get(id) ?? '').toLowerCase().includes(q)
        )
        if (!titleMatch && !descMatch && !charMatch && !placeMatch) continue
      }

      result.add(event.id)
    }
    return result
  }, [
    hasActiveFilter,
    events,
    search,
    statusFilter,
    layerFilter,
    characterFilter,
    placeFilter,
    characterLinksByEvent,
    placeLinksByEvent,
    characterNameById,
    placeNameById,
  ])

  async function handleChapterCellClick(layer: Layer, chapter: Chapter) {
    await createEvent({
      project_id: project.id,
      layer_id: layer.id,
      chapter_id: chapter.id,
      title: 'New Event',
      position: 0,
      duration: 1,
    })
    refreshEvents()
  }

  function idsInCell(layerId: string, chapterId: string, excludeId?: string) {
    return events
      .filter((e) => e.layer_id === layerId && e.chapter_id === chapterId && e.id !== excludeId)
      .sort((a, b) => a.position - b.position)
      .map((e) => e.id)
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveEvent(events.find((ev) => ev.id === e.active.id) ?? null)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveEvent(null)
    if (!over || active.id === over.id) return

    const dragged = events.find((ev) => ev.id === active.id)
    if (!dragged) return

    const overData = over.data.current as
      | { chapterId?: string; layerId?: string; isContainer?: boolean }
      | undefined
    if (!overData?.chapterId || !overData?.layerId) return

    const { chapterId: targetChapterId, layerId: targetLayerId } = overData
    const sameCell = dragged.chapter_id === targetChapterId && dragged.layer_id === targetLayerId

    const targetIds = idsInCell(targetLayerId, targetChapterId, active.id as string)
    const insertAt = overData.isContainer ? targetIds.length : targetIds.indexOf(over.id as string)
    targetIds.splice(insertAt === -1 ? targetIds.length : insertAt, 0, active.id as string)

    moveEventToCell(active.id as string, targetChapterId, targetLayerId, targetIds)

    if (!sameCell) {
      await moveEventToChapter(active.id as string, project.id, targetChapterId, targetLayerId)
    }
    await reorderEvents(project.id, targetIds)

    if (!sameCell) {
      const sourceIds = idsInCell(dragged.layer_id, dragged.chapter_id!, active.id as string)
      if (sourceIds.length > 0) await reorderEvents(project.id, sourceIds)
    }
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

  function handleCharacterLinked(eventId: string, characterId: string) {
    setEventCharacterLinks((prev) => [...prev, { event_id: eventId, character_id: characterId }])
  }

  function handleCharacterUnlinked(eventId: string, characterId: string) {
    setEventCharacterLinks((prev) =>
      prev.filter((l) => !(l.event_id === eventId && l.character_id === characterId))
    )
  }

  const visibleLayers = layers.filter((l) => l.visible)
  const visibleChapters = chapters.filter((c) => c.visible)
  const selectedLayer = selectedEvent
    ? layers.find((l) => l.id === selectedEvent.layer_id) ?? null
    : null

  return (
    <div className="flex h-full overflow-hidden">
      <LayerPanel
        project={project}
        layers={layers}
        onToggleVisibility={toggleVisibility}
        onReorder={reorder}
        onLayerAdded={refreshLayers}
        onLayerRemoved={removeLayer}
        onLayerRenamed={renameLayer}
        onLayerColorChanged={colorLayer}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-secondary/20 px-3">
          <div className="inline-flex items-center gap-1 rounded-lg bg-secondary/50 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                viewMode === 'grid'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('flow')}
              className={cn(
                'relative rounded-md px-2.5 py-1 text-xs font-medium transition-all after:absolute after:-inset-y-1 after:-inset-x-0.5',
                viewMode === 'flow'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Flow
            </button>
          </div>

          {/* Lives in this row rather than TimelineToolbar so it's reachable
              from Flow view too (the toolbar is Grid-only), and so it doesn't
              read as part of the filters — the export ignores them. */}
          <button
            onClick={() => setExportOpen(true)}
            aria-label="Export story bible"
            className="relative ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground after:absolute after:-inset-1 md:px-2.5"
          >
            <Download className="h-3 w-3" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>

        <ExportStoryBibleDialog projectId={project.id} open={exportOpen} onClose={() => setExportOpen(false)} />

        {viewMode === 'flow' ? (
          <TimelineFlowView
            projectId={project.id}
            layers={layers}
            events={events}
            chapters={chapters}
            selectedEventId={selectedEvent?.id ?? null}
            onSelectEvent={handleSelectEvent}
            onEventCreated={refreshEvents}
          />
        ) : (
          <>
            <TimelineToolbar
              search={search}
              onSearchChange={setSearch}
              layers={layers}
              characters={allCharacters}
              places={allPlaces}
              statuses={statuses}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              layerFilter={layerFilter}
              onLayerFilterChange={setLayerFilter}
              characterFilter={characterFilter}
              onCharacterFilterChange={setCharacterFilter}
              placeFilter={placeFilter}
              onPlaceFilterChange={setPlaceFilter}
            />
            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              <div className="inline-block min-w-full">
                <ChapterHeader
                  projectId={project.id}
                  chapters={chapters}
                  visibleChapters={visibleChapters}
                  allCharacters={allCharacters}
                  events={events}
                  onAdded={refreshChapters}
                  onRemoved={removeChapter}
                  onRenamed={renameChapter}
                  onUpdated={updateChapterLocal}
                  onOpenEvent={handleSelectEvent}
                  labelWidth={labelWidth}
                  chapterWidth={chapterWidth}
                  onLabelWidthChange={setLabelWidth}
                  onChapterWidthChange={setChapterWidth}
                />

                {chapters.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                    <p className="text-sm text-muted-foreground">No chapters yet</p>
                    <p className="text-xs text-muted-foreground">
                      Click &quot;Add Chapter&quot; above to create your first chapter
                    </p>
                  </div>
                ) : visibleChapters.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                    All chapters are hidden. Use the chapter visibility control above to show them.
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    {visibleLayers.map((layer) => (
                      <LayerRow
                        key={layer.id}
                        layer={layer}
                        events={eventsForLayer(layer.id)}
                        statuses={statuses}
                        visibleEventIds={visibleEventIds}
                        chapters={visibleChapters}
                        height={TRACK_HEIGHT}
                        selectedEventId={selectedEvent?.id ?? null}
                        onSelectEvent={(id) => {
                          const ev = events.find((e) => e.id === id)
                          if (ev) handleSelectEvent(ev)
                        }}
                        projectId={project.id}
                        onChapterCellClick={(chapter) =>
                          handleChapterCellClick(layer, chapter)
                        }
                        labelWidth={labelWidth}
                        chapterWidth={chapterWidth}
                      />
                    ))}

                    <DragOverlay>
                      {activeEvent && (
                        <EventCardPreview
                          event={activeEvent}
                          layer={layers.find((l) => l.id === activeEvent.layer_id) ?? layers[0]}
                          statuses={statuses}
                          width={chapterWidth - 24}
                        />
                      )}
                    </DragOverlay>
                  </DndContext>
                )}

                {visibleLayers.length === 0 && chapters.length > 0 && (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                    All layers are hidden. Toggle visibility in the layer panel.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <EventModal
        event={selectedEvent}
        layer={selectedLayer}
        chapters={chapters}
        layers={layers}
        statuses={statuses}
        onStatusReorder={reorderStatusLocal}
        allPlaces={allPlaces}
        allCharacters={allCharacters}
        onPlaceLinked={handlePlaceLinked}
        onPlaceUnlinked={handlePlaceUnlinked}
        onCharacterLinked={handleCharacterLinked}
        onCharacterUnlinked={handleCharacterUnlinked}
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
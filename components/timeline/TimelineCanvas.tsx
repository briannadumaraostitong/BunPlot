'use client'

import { useState } from 'react'
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
import { LayerPanel } from '@/components/layers/LayerPanel'
import { LayerRow, EventCardPreview } from '@/components/layers/LayerRow'
import { ChapterHeader, DEFAULT_CHAPTER_WIDTH, DEFAULT_LABEL_WIDTH } from './ChapterHeader'
import { EventModal } from '@/components/events/EventModal'
import { useLayers } from '@/hooks/useLayers'
import { useEvents } from '@/hooks/useEvents'
import { useChapters } from '@/hooks/useChapters'
import { createEvent, reorderEvents, moveEventToChapter } from '@/actions/events'
import type { Project, Layer, Event, Chapter } from '@/types/database'

interface TimelineCanvasProps {
  project: Project
  initialLayers: Layer[]
  initialEvents: Event[]
  initialChapters: Chapter[]
}

const TRACK_HEIGHT = 90

export function TimelineCanvas({
  project,
  initialLayers,
  initialEvents,
  initialChapters,
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
  } = useChapters(project.id, initialChapters)

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [labelWidth, setLabelWidth] = useState(DEFAULT_LABEL_WIDTH)
  const [chapterWidth, setChapterWidth] = useState(DEFAULT_CHAPTER_WIDTH)
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor)
  )

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

  const visibleLayers = layers.filter((l) => l.visible)
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
        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="inline-block min-w-full">
            <ChapterHeader
              projectId={project.id}
              chapters={chapters}
              onAdded={refreshChapters}
              onRemoved={removeChapter}
              onRenamed={renameChapter}
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
                    chapters={chapters}
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
      </div>

      <EventModal
        event={selectedEvent}
        layer={selectedLayer}
        chapters={chapters}
        layers={layers}
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
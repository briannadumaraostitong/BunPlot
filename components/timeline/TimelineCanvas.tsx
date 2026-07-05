'use client'

import { useState } from 'react'
import { LayerPanel } from '@/components/layers/LayerPanel'
import { LayerRow } from '@/components/layers/LayerRow'
import { ChapterHeader } from './ChapterHeader'
import { EventModal } from '@/components/events/EventModal'
import { useLayers } from '@/hooks/useLayers'
import { useEvents } from '@/hooks/useEvents'
import { useChapters } from '@/hooks/useChapters'
import { createEvent } from '@/actions/events'
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
  } = useEvents(project.id, initialEvents)

  const {
    chapters,
    refresh: refreshChapters,
    removeChapter,
    renameChapter,
  } = useChapters(project.id, initialChapters)

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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
        <div className="h-10 border-b border-border flex items-center px-3 shrink-0 bg-background">
          <span className="text-sm font-medium truncate">{project.title}</span>
        </div>

        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="inline-block min-w-full">
            <ChapterHeader
              projectId={project.id}
              chapters={chapters}
              onAdded={refreshChapters}
              onRemoved={removeChapter}
              onRenamed={renameChapter}
            />

            {chapters.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
                <p className="text-sm text-muted-foreground">No chapters yet</p>
                <p className="text-xs text-muted-foreground">
                  Click &quot;Add Chapter&quot; above to create your first chapter
                </p>
              </div>
            ) : (
              visibleLayers.map((layer) => (
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
                />
              ))
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
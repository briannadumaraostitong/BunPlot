'use client'

import { useState, useRef } from 'react'
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { LayerPanel } from '@/components/layers/LayerPanel'
import { LayerRow } from '@/components/layers/LayerRow'
import { TimelineRuler } from './TimelineRuler'
import { TimelineControls } from './TimelineControls'
import { useLayers } from '@/hooks/useLayers'
import { useEvents } from '@/hooks/useEvents'
import { moveEvent } from '@/actions/events'
import type { Project, Layer, Event } from '@/types/database'

interface TimelineCanvasProps {
  project: Project
  initialLayers: Layer[]
  initialEvents: Event[]
}

const TRACK_HEIGHT = 64
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4

export function TimelineCanvas({
  project,
  initialLayers,
  initialEvents,
}: TimelineCanvasProps) {
  const { layers, toggleVisibility, reorder } = useLayers(
    project.id,
    initialLayers
  )
  const { eventsForLayer, moveEventOptimistic } = useEvents(
    project.id,
    initialEvents
  )

  const [zoom, setZoom] = useState(1)
  const [scrollX, setScrollX] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, delta } = e
    if (!active || !canvasRef.current) return

    const canvasWidth = canvasRef.current.offsetWidth
    const deltaPosition = delta.x / canvasWidth / zoom

    const eventId = active.id as string
    const event = initialEvents.find((ev) => ev.id === eventId)
    if (!event) return

    const newPosition = Math.max(0, Math.min(1, event.position + deltaPosition))
    moveEventOptimistic(eventId, newPosition)
    moveEvent(eventId, project.id, newPosition)
  }

  const visibleLayers = layers.filter((l) => l.visible)

  return (
    <div className="flex h-full overflow-hidden">
      <LayerPanel
        project={project}
        layers={layers}
        onToggleVisibility={toggleVisibility}
        onReorder={reorder}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TimelineControls
          zoom={zoom}
          onZoomIn={() =>
            setZoom((z) => Math.min(MAX_ZOOM, +(z + 0.25).toFixed(2)))
          }
          onZoomOut={() =>
            setZoom((z) => Math.max(MIN_ZOOM, +(z - 0.25).toFixed(2)))
          }
          onZoomReset={() => setZoom(1)}
          project={project}
        />

        <TimelineRuler zoom={zoom} scrollX={scrollX} />

        <div
          className="flex-1 overflow-x-auto overflow-y-auto scrollbar-thin"
          onScroll={(e) =>
            setScrollX((e.target as HTMLDivElement).scrollLeft)
          }
        >
          <div
            ref={canvasRef}
            style={{ width: `${100 * zoom}%`, minWidth: '100%' }}
            className="relative"
          >
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              {visibleLayers.map((layer) => (
                <LayerRow
                  key={layer.id}
                  layer={layer}
                  events={eventsForLayer(layer.id)}
                  height={TRACK_HEIGHT}
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                  projectId={project.id}
                />
              ))}
            </DndContext>

            {visibleLayers.length === 0 && (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
                All layers are hidden. Toggle visibility in the layer panel.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
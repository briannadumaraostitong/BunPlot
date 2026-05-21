'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/events/EventCard'
import type { Layer, Event } from '@/types/database'

interface LayerRowProps {
  layer: Layer
  events: Event[]
  height: number
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  projectId: string
  variant?: 'timeline' | 'sidebar'
  onToggleVisibility?: () => void
}

export function LayerRow({
  layer,
  events,
  height,
  selectedEventId,
  onSelectEvent,
  variant = 'timeline',
  onToggleVisibility,
}: LayerRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: layer.id })

  const style =
    variant === 'sidebar'
      ? {
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        }
      : {}

  if (variant === 'sidebar') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-secondary/50 group"
      >
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: layer.color }}
        />

        <span className="text-xs flex-1 truncate" title={layer.name}>
          {layer.name}
        </span>

        <button
          onClick={onToggleVisibility}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        >
          {layer.visible ? (
            <Eye className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'timeline-track border-b border-border relative select-none',
        !layer.visible && 'opacity-40'
      )}
      style={{ height }}
    >
      <span
        className="absolute top-1 left-2 text-[10px] font-medium whitespace-nowrap z-10"
        style={{ color: layer.color }}
      >
        {layer.name}
      </span>

      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          layer={layer}
          trackHeight={height}
          selected={selectedEventId === event.id}
          onSelect={() =>
            onSelectEvent(selectedEventId === event.id ? null : event.id)
          }
        />
      ))}

      {[0.25, 0.5, 0.75].map((mark) => (
        <div
          key={mark}
          className="absolute top-0 bottom-0 w-px border-r border-dashed border-border opacity-30"
          style={{ left: `${mark * 100}%` }}
        />
      ))}
    </div>
  )
}
'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Event, Layer } from '@/types/database'

interface EventCardProps {
  event: Event
  layer: Layer
  trackHeight: number
  selected: boolean
  onSelect: () => void
}

export function EventCard({
  event,
  layer,
  trackHeight,
  selected,
  onSelect,
}: EventCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: event.id })

  const left = `${event.position * 100}%`
  const width = `${Math.max(event.duration * 100, 2)}%`
  const color = event.color ?? layer.color
  const top = 12
  const eventHeight = trackHeight - 24

  const style = {
    left,
    width,
    top,
    height: eventHeight,
    backgroundColor: color + '33',
    borderColor: color,
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : selected ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'event-card border',
        selected && 'ring-2 ring-offset-1',
        isDragging && 'shadow-xl opacity-90 cursor-grabbing'
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <span
        className="truncate block leading-tight text-xs font-medium"
        style={{ color }}
      >
        {event.icon && <span className="mr-1">{event.icon}</span>}
        {event.title}
      </span>
    </div>
  )
}
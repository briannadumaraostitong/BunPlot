'use client'

import { useDraggable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Event, Layer, EventStatus } from '@/types/database'

interface EventCardProps {
  event: Event
  layer: Layer
  trackHeight: number
  selected: boolean
  onSelect: () => void
  indexInCell?: number
  totalInCell?: number
}

const STATUS_INDICATORS: Record<EventStatus, string> = {
  draft:   'bg-zinc-400',
  outline: 'bg-blue-400',
  written: 'bg-yellow-400',
  revised: 'bg-purple-400',
  final:   'bg-green-400',
}

const STATUS_LABELS: Record<EventStatus, string> = {
  draft:   'Draft',
  outline: 'Outline',
  written: 'Written',
  revised: 'Revised',
  final:   'Final',
}

export function EventCard({
  event,
  layer,
  trackHeight,
  selected,
  onSelect,
  indexInCell = 0,
  totalInCell = 1,
}: EventCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({ id: event.id })

  const color = event.color ?? layer.color
  const cardHeight = Math.max((trackHeight - 8) / totalInCell - 4, 28)
  const top = 4 + indexInCell * (cardHeight + 4)

  const style: React.CSSProperties = {
    top,
    left: 4,
    right: 4,
    height: cardHeight,
    backgroundColor: color + '20',
    borderLeftColor: color,
    borderColor: selected ? color : color + '60',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'absolute border-l-2 border rounded-md overflow-hidden',
        'flex flex-col justify-between px-2 py-1 cursor-pointer',
        'transition-shadow duration-100 select-none',
        selected && 'ring-2 ring-offset-1 shadow-lg',
        isDragging && 'shadow-xl opacity-90'
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <span
        className="text-[11px] font-semibold leading-tight truncate block"
        style={{ color }}
      >
        {event.icon && <span className="mr-1">{event.icon}</span>}
        {event.title}
      </span>

      <div className="flex items-center gap-1 mt-auto">
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            STATUS_INDICATORS[event.status]
          )}
        />
        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
          {STATUS_LABELS[event.status]}
        </span>
      </div>
    </div>
  )
}
'use client'

import { useState, useRef } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Trash2, Check, X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RenameHint } from '@/components/ui/rename-hint'
import { deleteLayer, updateLayer } from '@/actions/layers'
import { playClickSound } from '@/lib/sound'
import { reportResult, settle } from '@/lib/notify'
import type { Layer, Event, Chapter, Status } from '@/types/database'

const FALLBACK_STATUS_COLOR = '#71717a'

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function previewText(html: string | null, max = 80) {
  if (!html) return ''
  const text = stripHtml(html)
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

interface LayerRowProps {
  layer: Layer
  events: Event[]
  statuses: Status[]
  chapters: Chapter[]
  height: number
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  projectId: string
  variant?: 'timeline' | 'sidebar'
  visibleEventIds?: Set<string>
  onToggleVisibility?: () => void
  onDeleted?: () => void
  onRenamed?: (newName: string) => void
  onColorChanged?: (color: string) => void
  onChapterCellClick?: (chapter: Chapter) => void
  labelWidth?: number
  chapterWidth?: number
}

export function LayerRow({
  layer,
  events,
  statuses,
  chapters,
  height,
  selectedEventId,
  onSelectEvent,
  projectId,
  variant = 'timeline',
  visibleEventIds,
  onToggleVisibility,
  onDeleted,
  onRenamed,
  onColorChanged,
  onChapterCellClick,
  labelWidth = 120,
  chapterWidth = 220,
}: LayerRowProps) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(layer.name)
  const colorInputRef = useRef<HTMLInputElement>(null)

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

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (layer.type === 'main') return
    setDeleting(true)
    const result = await settle(deleteLayer(layer.id, projectId))
    if (reportResult(result, "Couldn't delete the layer.")) onDeleted?.()
    setDeleting(false)
  }

  async function handleRename() {
    if (!name.trim() || name === layer.name) {
      setName(layer.name)
      setEditing(false)
      return
    }
    const result = await settle(updateLayer(layer.id, projectId, { name: name.trim() }))
    if (reportResult(result, "Couldn't rename the layer.")) onRenamed?.(name.trim())
    setEditing(false)
  }

  async function handleColorChange(color: string) {
    const result = await settle(updateLayer(layer.id, projectId, { color }))
    if (reportResult(result, "Couldn't change the layer color.")) onColorChanged?.(color)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setName(layer.name)
      setEditing(false)
    }
  }

  if (variant === 'sidebar') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1.5 mx-1 px-2 py-1.5 rounded-md hover:bg-secondary/50 transition-colors group"
      >
        <button
          {...attributes}
          {...listeners}
          className="relative touch-none cursor-grab active:cursor-grabbing text-muted-foreground opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 after:absolute after:-inset-1.5"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="relative shrink-0">
          <button
            onClick={() => colorInputRef.current?.click()}
            className="relative h-3 w-3 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/15 transition-transform hover:scale-125 focus:outline-none after:absolute after:-inset-1.5"
            style={{ backgroundColor: layer.color }}
            title="Click to change color"
          />
          <input
            ref={colorInputRef}
            type="color"
            value={layer.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            tabIndex={-1}
          />
        </div>

        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="flex-1 min-w-0 text-base md:text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
            />
            <button
              onClick={handleRename}
              className="relative text-primary shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
            >
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => { setName(layer.name); setEditing(false) }}
              className="relative text-muted-foreground shrink-0 after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <RenameHint name={layer.name}>
            <span
              className="text-xs flex-1 truncate cursor-default"
              onDoubleClick={() => setEditing(true)}
            >
              {layer.name}
            </span>
          </RenameHint>
        )}

        {!editing && (
          <div className="flex items-center gap-0.5 opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleVisibility}
              className="relative text-muted-foreground hover:text-foreground p-0.5 after:absolute after:-inset-y-1.5"
            >
              {layer.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
            </button>

            {layer.type !== 'main' && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="relative text-muted-foreground hover:text-destructive p-0.5 transition-colors after:absolute after:-inset-y-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Timeline variant ─────────────────────────────────────
  const maxEventsInAnyChapter = Math.max(
    1,
    ...chapters.map(
      (chapter) => events.filter((e) => e.chapter_id === chapter.id).length
    )
  )
  const dynamicHeight = Math.max(height, maxEventsInAnyChapter * 80 + 16)

  return (
    <div
      className={cn(
        'flex border-b border-border relative select-none',
        !layer.visible && 'opacity-40'
      )}
      style={{ height: dynamicHeight }}
    >
      {/* Layer name label */}
      <div
        className="flex items-center px-2 shrink-0 border-r border-border bg-secondary/30"
        style={{ width: labelWidth, minWidth: labelWidth, height: dynamicHeight }}
      >
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: layer.color }}
        >
          {layer.name}
        </span>
      </div>

      {/* Chapter cells */}
      {chapters.map((chapter) => {
        const chapterEvents = events.filter((e) => e.chapter_id === chapter.id)
        return (
          <ChapterCell
            key={chapter.id}
            chapter={chapter}
            events={chapterEvents}
            statuses={statuses}
            visibleEventIds={visibleEventIds}
            layer={layer}
            height={dynamicHeight}
            width={chapterWidth}
            selectedEventId={selectedEventId}
            onSelectEvent={onSelectEvent}
            onAddClick={() => onChapterCellClick?.(chapter)}
          />
        )
      })}

      <div style={{ minWidth: 140 }} className="shrink-0" />
    </div>
  )
}

function cellDroppableId(layerId: string, chapterId: string) {
  return `cell:${layerId}:${chapterId}`
}

function ChapterCell({
  chapter,
  events,
  statuses,
  visibleEventIds,
  layer,
  height,
  width,
  selectedEventId,
  onSelectEvent,
  onAddClick,
}: {
  chapter: Chapter
  events: Event[]
  statuses: Status[]
  visibleEventIds?: Set<string>
  layer: Layer
  height: number
  width: number
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  onAddClick: () => void
}) {
  const [hovering, setHovering] = useState(false)
  const renderedEvents = visibleEventIds ? events.filter((e) => visibleEventIds.has(e.id)) : events

  const { setNodeRef } = useDroppable({
    id: cellDroppableId(layer.id, chapter.id),
    data: { chapterId: chapter.id, layerId: layer.id, isContainer: true },
  })

  return (
    <div
      ref={setNodeRef}
      className="relative border-r border-border timeline-track shrink-0 flex flex-col"
      style={{ width, minWidth: width, height }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <SortableContext
        items={renderedEvents.map((e) => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 p-2 flex-1">
          {renderedEvents.map((event) => (
            <EventCardStacked
              key={event.id}
              event={event}
              layer={layer}
              statuses={statuses}
              selected={selectedEventId === event.id}
              onSelect={() =>
                onSelectEvent(selectedEventId === event.id ? null : event.id)
              }
            />
          ))}
        </div>
      </SortableContext>

      {hovering && (
        <button
          onClick={onAddClick}
          className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground flex items-center justify-center shadow-md transition-all hover:scale-110"
          title={`Add event to ${chapter.title}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function EventCardStacked({
  event,
  layer,
  statuses,
  selected,
  onSelect,
}: {
  event: Event
  layer: Layer
  statuses: Status[]
  selected: boolean
  onSelect: () => void
}) {
  const color = event.color ?? layer.color
  const status = statuses.find((s) => s.id === event.status_id)
  const statusColor = status?.color ?? FALLBACK_STATUS_COLOR
  const description = previewText(event.description)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: event.id,
    data: { chapterId: event.chapter_id, layerId: event.layer_id },
  })

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => { e.stopPropagation(); playClickSound(); onSelect() }}
      className={cn(
        'group relative rounded-lg pl-2.5 pr-4 py-1.5 cursor-pointer select-none',
        'flex flex-col gap-1 shadow-sm transition-all duration-100',
        'hover:brightness-110 hover:shadow-md',
        selected && 'ring-2 ring-offset-1 shadow-lg',
        isDragging && 'z-10'
      )}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: color + '18',
        borderTopWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
        borderLeftWidth: '3px',
        borderTopColor: selected ? color : color + '40',
        borderRightColor: selected ? color : color + '40',
        borderBottomColor: selected ? color : color + '40',
        borderLeftColor: color,
        borderStyle: 'solid',
      }}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-1.5 right-1 h-4 w-4 flex touch-none items-center justify-center text-muted-foreground opacity-100 md:can-hover:opacity-0 md:group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity after:absolute after:-inset-1.5"
      >
        <GripVertical className="h-3 w-3" />
      </button>

      <span
        className="text-[11px] font-semibold leading-tight truncate"
        style={{ color }}
      >
        {event.icon && <span className="mr-1">{event.icon}</span>}
        {event.title}
      </span>

      {description && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>
      )}

      <span
        className="self-start px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide leading-none text-foreground"
        style={{ backgroundColor: statusColor + '66' }}
      >
        {status?.name ?? 'Unknown'}
      </span>
    </div>
  )
}

export function EventCardPreview({
  event,
  layer,
  statuses,
  width,
}: {
  event: Event
  layer: Layer
  statuses: Status[]
  width: number
}) {
  const color = event.color ?? layer.color
  const status = statuses.find((s) => s.id === event.status_id)
  const statusColor = status?.color ?? FALLBACK_STATUS_COLOR
  const description = previewText(event.description)

  return (
    <div
      className="rounded-lg pl-2.5 pr-4 py-1.5 flex flex-col gap-1 shadow-lg cursor-grabbing"
      style={{
        width,
        backgroundColor: color + '18',
        borderTopWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
        borderLeftWidth: '3px',
        borderTopColor: color,
        borderRightColor: color,
        borderBottomColor: color,
        borderLeftColor: color,
        borderStyle: 'solid',
      }}
    >
      <span className="text-[11px] font-semibold leading-tight truncate" style={{ color }}>
        {event.icon && <span className="mr-1">{event.icon}</span>}
        {event.title}
      </span>

      {description && (
        <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
          {description}
        </p>
      )}

      <span
        className="self-start px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide leading-none text-foreground"
        style={{ backgroundColor: statusColor + '5c' }}
      >
        {status?.name ?? 'Unknown'}
      </span>
    </div>
  )
}
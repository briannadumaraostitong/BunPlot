'use client'

import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Eye, EyeOff, GripVertical, Trash2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventCard } from '@/components/events/EventCard'
import { deleteLayer, updateLayer } from '@/actions/layers'
import type { Layer, Event, Chapter } from '@/types/database'
import { CHAPTER_WIDTH } from '@/components/timeline/ChapterHeader'

interface LayerRowProps {
  layer: Layer
  events: Event[]
  chapters: Chapter[]
  height: number
  selectedEventId: string | null
  onSelectEvent: (id: string | null) => void
  projectId: string
  variant?: 'timeline' | 'sidebar'
  onToggleVisibility?: () => void
  onDeleted?: () => void
  onRenamed?: (newName: string) => void
  onColorChanged?: (color: string) => void
  onChapterCellClick?: (chapter: Chapter) => void
}

export function LayerRow({
  layer,
  events,
  chapters,
  height,
  selectedEventId,
  onSelectEvent,
  projectId,
  variant = 'timeline',
  onToggleVisibility,
  onDeleted,
  onRenamed,
  onColorChanged,
  onChapterCellClick,
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
    await deleteLayer(layer.id, projectId)
    onDeleted?.()
    setDeleting(false)
  }

  async function handleRename() {
    if (!name.trim() || name === layer.name) {
      setName(layer.name)
      setEditing(false)
      return
    }
    await updateLayer(layer.id, projectId, { name: name.trim() })
    onRenamed?.(name.trim())
    setEditing(false)
  }

  async function handleColorChange(color: string) {
    await updateLayer(layer.id, projectId, { color })
    onColorChanged?.(color)
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
        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-secondary/50 group"
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Color dot */}
        <div className="relative shrink-0">
          <button
            onClick={() => colorInputRef.current?.click()}
            className="h-3 w-3 rounded-full transition-transform hover:scale-125 focus:outline-none"
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

        {/* Name */}
        {editing ? (
          <div className="flex items-center gap-1 flex-1 min-w-0">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="flex-1 min-w-0 text-xs bg-background border border-border rounded px-1.5 py-0.5 outline-none focus:border-primary"
            />
            <button onClick={handleRename} className="text-primary shrink-0">
              <Check className="h-3 w-3" />
            </button>
            <button
              onClick={() => { setName(layer.name); setEditing(false) }}
              className="text-muted-foreground shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <span
            className="text-xs flex-1 truncate cursor-pointer"
            title={`${layer.name} — double-click to rename`}
            onDoubleClick={() => setEditing(true)}
          >
            {layer.name}
          </span>
        )}

        {/* Actions */}
        {!editing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onToggleVisibility}
              className="text-muted-foreground hover:text-foreground p-0.5"
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
                className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
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
  return (
    <div
      className={cn(
        'flex border-b border-border relative select-none',
        !layer.visible && 'opacity-40'
      )}
      style={{ height }}
    >
      <div
        className="flex items-center px-2 shrink-0 border-r border-border bg-secondary/30"
        style={{ width: 120, minWidth: 120, height }}
      >
        <span
          className="text-[11px] font-medium truncate"
          style={{ color: layer.color }}
        >
          {layer.name}
        </span>
      </div>

      {chapters.map((chapter) => {
        const chapterEvents = events.filter((e) => e.chapter_id === chapter.id)
        return (
          <div
            key={chapter.id}
            onClick={() => onChapterCellClick?.(chapter)}
            className="relative border-r border-border timeline-track cursor-crosshair shrink-0"
            style={{ width: CHAPTER_WIDTH, minWidth: CHAPTER_WIDTH, height }}
          >
            {chapterEvents.map((event, idx) => (
              <EventCard
                key={event.id}
                event={event}
                layer={layer}
                trackHeight={height}
                indexInCell={idx}
                totalInCell={chapterEvents.length}
                selected={selectedEventId === event.id}
                onSelect={() =>
                  onSelectEvent(selectedEventId === event.id ? null : event.id)
                }
              />
            ))}
          </div>
        )
      })}

      <div style={{ minWidth: 140 }} className="shrink-0" />
    </div>
  )
}
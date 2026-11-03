'use client'

import { useRef, useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDndSensors } from '@/hooks/useDndSensors'
import { GripVertical, Star, Trash2, Pencil, Check, X, Plus, Loader2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  createStatus,
  updateStatus,
  reorderStatuses,
  setDefaultStatus,
  deleteStatus,
} from '@/actions/statuses'
import { settle } from '@/lib/notify'
import type { Status } from '@/types/database'

const FALLBACK_COLOR = '#71717a'

interface StatusPickerProps {
  statuses: Status[]
  projectId: string
  value: string
  onChange: (statusId: string) => void
  onReorder?: (from: number, to: number) => void
}

export function StatusPicker({ statuses, projectId, value, onChange, onReorder }: StatusPickerProps) {
  const [open, setOpen] = useState(false)
  const sensors = useDndSensors()
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = statuses.find((s) => s.id === value)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setError(null)
  }

  async function handleAddStatus() {
    if (adding) return
    setAdding(true)
    setError(null)
    const result = await settle(createStatus(projectId, `Status ${statuses.length + 1}`))
    if ('error' in result) setError(result.error)
    setAdding(false)
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = statuses.findIndex((s) => s.id === active.id)
    const to = statuses.findIndex((s) => s.id === over.id)
    if (from === -1 || to === -1) return
    // Optimistic first — without this, the row snaps back to its old spot the
    // instant the drag ends (dnd-kit's transform clears immediately), then
    // snaps again once reorderStatuses + the realtime refresh land.
    onReorder?.(from, to)
    const newOrder = [...statuses]
    const [moved] = newOrder.splice(from, 1)
    newOrder.splice(to, 0, moved)
    setError(null)
    const result = await settle(reorderStatuses(projectId, newOrder.map((s) => s.id)))
    if ('error' in result) setError(result.error)
  }

  function handleSelect(status: Status) {
    onChange(status.id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Colors come from --status-color rather than inline styles, so a
            theme stylesheet can restyle the tag. */}
        <button
          type="button"
          data-slot="status-tag"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-opacity hover:opacity-80 bg-(--status-color)/[18.82%] text-(--status-color)"
          style={{ '--status-color': current?.color ?? FALLBACK_COLOR } as React.CSSProperties}
        >
          <span data-slot="status-tag-dot" className="h-1.5 w-1.5 rounded-full bg-(--status-color)" />
          {current?.name ?? 'Status'}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-60 gap-0 p-0">
        {error && (
          <p className="border-b border-border p-2 text-[11px] text-destructive">{error}</p>
        )}

        <div className="max-h-56 overflow-y-auto scrollbar-thin p-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              {statuses.map((status) => (
                <StatusRow
                  key={status.id}
                  status={status}
                  projectId={projectId}
                  selected={status.id === value}
                  onSelect={() => handleSelect(status)}
                  onError={setError}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="border-t border-border p-1">
          <button
            onClick={handleAddStatus}
            disabled={adding}
            className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            {adding ? 'Adding...' : 'Add status'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusRow({
  status,
  projectId,
  selected,
  onSelect,
  onError,
}: {
  status: Status
  projectId: string
  selected: boolean
  onSelect: () => void
  onError: (message: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(status.name)
  const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (status.is_default) return
    setDeleting(true)
    const result = await settle(deleteStatus(status.id, projectId))
    if (result && 'error' in result) onError(result.error)
    setDeleting(false)
  }

  async function handleRename() {
    if (!name.trim() || name === status.name) {
      setName(status.name)
      setEditing(false)
      return
    }
    const result = await settle(updateStatus(status.id, projectId, { name: name.trim() }))
    if ('error' in result) onError(result.error)
    setEditing(false)
  }

  // Fires on 'input' (live, during the picker interaction) rather than 'change'
  // (fires once, on commit) — some native color pickers treat dismissing by
  // clicking away as a cancel and revert the input's value before 'change'
  // ever sees the color the user actually picked. 'input' already has it.
  // Debounced so dragging across the picker's gradient doesn't fire an
  // updateStatus call per pixel, and so an in-flight request from an earlier
  // color can't resolve after a later one and clobber it.
  function handleColorInput(color: string) {
    if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current)
    colorDebounceRef.current = setTimeout(() => {
      settle(updateStatus(status.id, projectId, { color })).then((result) => {
        if ('error' in result) onError(result.error)
      })
    }, 200)
  }

  async function handleSetDefault(e: React.MouseEvent) {
    e.stopPropagation()
    const result = await settle(setDefaultStatus(status.id, projectId))
    if (result && 'error' in result) onError(result.error)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setName(status.name)
      setEditing(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => {
        if (!editing) onSelect()
      }}
      className={cn(
        'group flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-secondary/50',
        selected && 'bg-secondary/30'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="relative shrink-0 touch-none cursor-grab text-muted-foreground opacity-100 transition-opacity active:cursor-grabbing after:absolute after:-inset-1.5 md:can-hover:opacity-0 md:group-hover:opacity-100"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <label
        className="relative h-3 w-3 shrink-0 cursor-pointer rounded-full ring-1 ring-inset ring-black/15 transition-transform hover:scale-125 dark:ring-white/15 after:absolute after:-inset-1.5"
        style={{ backgroundColor: status.color }}
        title="Click to change color"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="color"
          value={status.color}
          onInput={(e) => handleColorInput(e.currentTarget.value)}
          className="absolute inset-0 h-full w-full opacity-0"
          tabIndex={-1}
        />
      </label>

      {editing ? (
        <div className="flex min-w-0 flex-1 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-base md:text-xs outline-none focus:border-primary"
          />
          <button
            onClick={handleRename}
            className="relative shrink-0 text-primary after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
          >
            <Check className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              setName(status.name)
              setEditing(false)
            }}
            className="relative shrink-0 text-muted-foreground after:absolute after:-inset-y-1.5 after:-inset-x-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <span className="flex-1 truncate text-xs">{status.name}</span>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setEditing(true)
            }}
            title="Rename status"
            className="relative p-0.5 text-muted-foreground/40 opacity-100 transition-opacity hover:text-foreground md:can-hover:opacity-0 md:group-hover:opacity-100 after:absolute after:-inset-y-1.5"
          >
            <Pencil className="h-3 w-3" />
          </button>

          {status.is_default ? (
            <span title="Default status">
              <Star className="h-3 w-3 fill-current text-muted-foreground" />
            </span>
          ) : (
            <button
              onClick={handleSetDefault}
              title="Set as default"
              className="relative p-0.5 text-muted-foreground/40 opacity-100 transition-opacity hover:text-foreground md:can-hover:opacity-0 md:group-hover:opacity-100 after:absolute after:-inset-y-1.5"
            >
              <Star className="h-3 w-3" />
            </button>
          )}

          {!status.is_default && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete status"
              className="relative p-0.5 text-muted-foreground opacity-100 transition-colors md:can-hover:opacity-0 md:group-hover:opacity-100 hover:text-destructive after:absolute after:-inset-y-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

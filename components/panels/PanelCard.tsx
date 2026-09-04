'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2, Image as ImageIcon, Pencil } from 'lucide-react'
import type { PanelWithCover, ActionResult } from '@/actions/panels'

interface PanelCardProps {
  panel: PanelWithCover
  onCaptionChanged: (caption: string) => Promise<ActionResult>
  onDeleted: () => Promise<ActionResult>
  onOpenSketch: () => void
}

export function PanelCard({ panel, onCaptionChanged, onDeleted, onOpenSketch }: PanelCardProps) {
  const [caption, setCaption] = useState(panel.caption ?? '')
  const [error, setError] = useState<string | null>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: panel.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  async function handleCaptionBlur() {
    if (caption === (panel.caption ?? '')) return
    const result = await onCaptionChanged(caption)
    if ('error' in result) setError(result.error)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const result = await onDeleted()
    if ('error' in result) setError(result.error)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex flex-col rounded-lg border border-border bg-card overflow-hidden"
    >
      <div
        onClick={onOpenSketch}
        className="group/image relative flex aspect-3/4 w-full cursor-pointer items-center justify-center bg-secondary/20"
      >
        {panel.cover_url ? (
          <img src={panel.cover_url} alt={panel.caption ?? ''} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-background/70 opacity-0 transition-opacity group-hover/image:opacity-100">
          <span className="flex items-center gap-1 px-2 text-center text-xs font-medium text-foreground">
            <Pencil className="h-3.5 w-3.5" />
            {panel.cover_url ? 'Edit sketch' : 'Sketch'}
          </span>
        </div>

        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={handleDelete}
          title="Delete panel"
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-sm transition-opacity hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        {error && (
          <p className="absolute bottom-1 left-1.5 right-1.5 text-[10px] text-destructive bg-card/90 rounded px-1">
            {error}
          </p>
        )}
      </div>

      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        onBlur={handleCaptionBlur}
        placeholder="Add a caption..."
        className="w-full bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}

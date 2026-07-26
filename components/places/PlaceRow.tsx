'use client'

import { useRef, useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deletePlace, updatePlace } from '@/actions/places'
import { PLACE_TYPE_LABELS } from '@/lib/places.config'
import type { PlaceWithCover } from '@/actions/places'

interface PlaceRowProps {
  place: PlaceWithCover
  selected: boolean
  onSelect: () => void
  onColorChanged: (color: string) => void
  onDeleted: () => void
}

export function PlaceRow({ place, selected, onSelect, onColorChanged, onDeleted }: PlaceRowProps) {
  const [deleting, setDeleting] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)

  async function handleColorChange(color: string) {
    await updatePlace(place.id, place.project_id, { color })
    onColorChanged(color)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (deleting) return
    setDeleting(true)
    await deletePlace(place.id, place.project_id)
    onDeleted()
    setDeleting(false)
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-2 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        selected ? 'bg-secondary' : 'hover:bg-secondary/50'
      )}
    >
      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            colorInputRef.current?.click()
          }}
          className="h-3 w-3 rounded-full ring-1 ring-inset ring-black/15 dark:ring-white/15 transition-transform hover:scale-125"
          style={{ backgroundColor: place.color ?? '#6366F1' }}
          title="Click to change color"
        />
        <input
          ref={colorInputRef}
          type="color"
          value={place.color ?? '#6366F1'}
          onChange={(e) => handleColorChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{place.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{PLACE_TYPE_LABELS[place.type]}</p>
      </div>

      <button
        onClick={handleDelete}
        disabled={deleting}
        title="Delete place"
        className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

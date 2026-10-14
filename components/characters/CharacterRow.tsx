'use client'

import { useRef, useState } from 'react'
import { Trash2, Loader2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playClickSound } from '@/lib/sound'
import { deleteCharacter, updateCharacter } from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import type { Character } from '@/types/database'

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

interface CharacterRowProps {
  character: Character
  selected: boolean
  hasRelationships: boolean
  onSelect: () => void
  onColorChanged: (color: string) => void
  onDeleted: () => void
  onAddToCanvas: () => void
}

export function CharacterRow({
  character,
  selected,
  hasRelationships,
  onSelect,
  onColorChanged,
  onDeleted,
  onAddToCanvas,
}: CharacterRowProps) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  async function handleColorChange(color: string) {
    const result = await settle(updateCharacter(character.id, character.project_id, { color }))
    if (reportResult(result, "Couldn't change the character color.")) onColorChanged(color)
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (hasRelationships || deleting) return
    setDeleting(true)
    setError(null)
    const result = await settle(deleteCharacter(character.id, character.project_id))
    if (result && 'error' in result) {
      setError(result.error)
      setDeleting(false)
      return
    }
    onDeleted()
    setDeleting(false)
  }

  return (
    <div
      onClick={() => {
        playClickSound()
        onSelect()
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', character.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className={cn(
        'group flex items-center gap-2 mx-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
        selected ? 'bg-secondary' : 'hover:bg-secondary/50'
      )}
    >
      <div className="relative shrink-0">
        <div
          className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold text-white ring-1 ring-inset ring-black/15 dark:ring-white/15"
          style={{ backgroundColor: character.color ?? '#6366F1' }}
        >
          {getInitials(character.name)}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            colorInputRef.current?.click()
          }}
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-background transition-transform hover:scale-125 after:absolute after:-inset-1.5"
          style={{ backgroundColor: character.color ?? '#6366F1' }}
          title="Click to change color"
        />
        <input
          ref={colorInputRef}
          type="color"
          value={character.color ?? '#6366F1'}
          onChange={(e) => handleColorChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          tabIndex={-1}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{character.name}</p>
        {character.role && (
          <p className="text-[10px] text-muted-foreground truncate">{character.role}</p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onAddToCanvas()
        }}
        title="Add to canvas"
        className="relative shrink-0 p-0.5 text-muted-foreground transition-colors hover:text-foreground after:absolute after:-inset-1.5 md:hidden"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={handleDelete}
        disabled={hasRelationships || deleting}
        title={hasRelationships ? 'Remove relationships before deleting' : 'Delete character'}
        className={cn(
          'relative shrink-0 p-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity after:absolute after:-inset-1.5',
          hasRelationships
            ? 'text-muted-foreground/40 cursor-not-allowed'
            : 'text-muted-foreground hover:text-destructive'
        )}
      >
        {deleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5" />
        )}
      </button>

      {error && (
        <p className="absolute z-10 mt-8 text-[10px] text-destructive bg-card border border-border rounded px-1.5 py-0.5 shadow-md">
          {error}
        </p>
      )}
    </div>
  )
}

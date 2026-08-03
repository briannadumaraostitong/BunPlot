'use client'

import { useRef, useState } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { playClickSound } from '@/lib/sound'
import { getInitials } from './CharacterRow'
import type { Character } from '@/types/database'

export const NODE_WIDTH = 168
export const NODE_HEIGHT = 68

interface CharacterNodeProps {
  character: Character
  x: number
  y: number
  selected: boolean
  pending: boolean
  onClick: () => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  onRemoveFromTree: () => void
}

export function CharacterNode({
  character,
  x,
  y,
  selected,
  pending,
  onClick,
  onDragMove,
  onDragEnd,
  onRemoveFromTree,
}: CharacterNodeProps) {
  const dragState = useRef<{
    startX: number
    startY: number
    originX: number
    originY: number
    moved: boolean
  } | null>(null)
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: x, originY: y, moved: false }
    setDragging(true)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const state = dragState.current
    if (!state) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true
    if (state.moved) {
      onDragMove(Math.max(0, state.originX + dx), Math.max(0, state.originY + dy))
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const state = dragState.current
    if (!state) return
    setDragging(false)
    dragState.current = null
    if (state.moved) {
      const dx = e.clientX - state.startX
      const dy = e.clientY - state.startY
      onDragEnd(Math.max(0, state.originX + dx), Math.max(0, state.originY + dy))
    } else {
      playClickSound()
      onClick()
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        'group absolute flex items-center gap-2 rounded-lg bg-card px-2.5 py-2 shadow-sm select-none cursor-grab active:cursor-grabbing transition-shadow',
        pending ? 'border-2' : 'border',
        dragging ? 'shadow-lg z-20' : 'z-10 hover:shadow-md',
        selected && 'ring-2 ring-ring ring-offset-1'
      )}
      style={{
        left: x,
        top: y,
        width: NODE_WIDTH,
        borderColor: pending ? 'hsl(var(--accent))' : (character.color ?? '#6366F1') + '55',
      }}
    >
      {pending && (
        <span
          className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: 'hsl(var(--accent))' }}
        >
          <Link2 className="h-2.5 w-2.5" />
        </span>
      )}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemoveFromTree()
        }}
        title="Remove from this tree"
        className="absolute -top-2 -left-2 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-100 md:opacity-0 shadow-sm transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-2.5"
      >
        <Unlink className="h-2.5 w-2.5" />
      </button>
      <div
        className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold text-white"
        style={{ backgroundColor: character.color ?? '#6366F1' }}
      >
        {getInitials(character.name)}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium truncate">{character.name}</p>
        {character.role && (
          <p className="text-[10px] text-muted-foreground truncate">{character.role}</p>
        )}
      </div>
    </div>
  )
}

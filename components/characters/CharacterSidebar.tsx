'use client'

import { useEffect, useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CharacterRow } from './CharacterRow'
import { createCharacter } from '@/actions/characters'
import { cn } from '@/lib/utils'
import type { Character } from '@/types/database'

interface CharacterSidebarProps {
  projectId: string
  characters: Character[]
  selectedCharacterId: string | null
  relatedCharacterIds: Set<string>
  onSelect: (id: string) => void
  onCharacterAdded: (character: Character) => void
  onCharacterColorChanged: (id: string, color: string) => void
  onCharacterDeleted: (id: string) => void
  onAddToCanvas: (characterId: string) => void
}

export function CharacterSidebar({
  projectId,
  characters,
  selectedCharacterId,
  relatedCharacterIds,
  onSelect,
  onCharacterAdded,
  onCharacterColorChanged,
  onCharacterDeleted,
  onAddToCanvas,
}: CharacterSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)

  // Defaults to collapsed below md — checked once on mount, not a live
  // resize listener, so it doesn't fight the user's own chevron toggle
  // after the initial render (matches the Tailwind md breakpoint, 768px).
  useEffect(() => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      setCollapsed(true)
    }
  }, [])

  async function handleAddCharacter() {
    if (adding) return
    setAdding(true)
    const created = await createCharacter(projectId, `Character ${characters.length + 1}`)
    if (!('error' in created)) {
      onCharacterAdded(created)
    }
    setAdding(false)
  }

  return (
    <div
      className={cn(
        'flex flex-col border-r border-border bg-sidebar shrink-0 transition-all duration-200',
        collapsed ? 'w-10' : 'w-52'
      )}
    >
      <div className="h-10 border-b border-border flex items-center justify-between px-2 shrink-0">
        {!collapsed && (
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Characters
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 ml-auto after:absolute after:-inset-2.5"
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            {characters.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
                No characters yet
              </p>
            ) : (
              characters.map((character) => (
                <CharacterRow
                  key={character.id}
                  character={character}
                  selected={character.id === selectedCharacterId}
                  hasRelationships={relatedCharacterIds.has(character.id)}
                  onSelect={() => onSelect(character.id)}
                  onColorChanged={(color) => onCharacterColorChanged(character.id, color)}
                  onDeleted={() => onCharacterDeleted(character.id)}
                  onAddToCanvas={() => onAddToCanvas(character.id)}
                />
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAddCharacter}
              disabled={adding}
            >
              {adding ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              {adding ? 'Adding...' : 'Add Character'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

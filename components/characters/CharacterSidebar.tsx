'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CharacterRow } from './CharacterRow'
import { createCharacter } from '@/actions/characters'
import { reportResult, settle } from '@/lib/notify'
import { cn } from '@/lib/utils'
import { useIsBelowMd } from '@/hooks/useIsBelowMd'
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
  // null until the chevron is used: until then the sidebar follows the
  // breakpoint (collapsed below md); after that it keeps the user's choice.
  const isBelowMd = useIsBelowMd()
  const [userCollapsed, setUserCollapsed] = useState<boolean | null>(null)
  const collapsed = userCollapsed ?? isBelowMd
  const [adding, setAdding] = useState(false)

  async function handleAddCharacter() {
    if (adding) return
    setAdding(true)
    const created = await settle(createCharacter(projectId, `Character ${characters.length + 1}`))
    if (reportResult(created, "Couldn't create the character.")) {
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
          <span data-slot="panel-heading" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Characters
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-6 w-6 ml-auto after:absolute after:-inset-2.5"
          onClick={() => setUserCollapsed(!collapsed)}
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

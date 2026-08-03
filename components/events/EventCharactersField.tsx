'use client'

import { useMemo, useState } from 'react'
import { Sparkles, Users, Plus, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Character } from '@/types/database'

interface EventCharactersFieldProps {
  characters: Character[]
  allCharacters: Character[]
  suggestedCharacters: Character[]
  loading: boolean
  onAdd: (character: Character) => void
  onRemove: (characterId: string) => void
}

export function EventCharactersField({
  characters,
  allCharacters,
  suggestedCharacters,
  loading,
  onAdd,
  onRemove,
}: EventCharactersFieldProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const linkedIds = useMemo(() => new Set(characters.map((c) => c.id)), [characters])
  const visibleSuggestions = useMemo(
    () => suggestedCharacters.filter((c) => !linkedIds.has(c.id)),
    [suggestedCharacters, linkedIds]
  )
  const available = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allCharacters.filter((c) => !linkedIds.has(c.id) && (!q || c.name.toLowerCase().includes(q)))
  }, [allCharacters, linkedIds, search])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setSearch('')
  }

  function handleSelect(character: Character) {
    onAdd(character)
    setSearch('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Users className="h-3 w-3" />
        Characters
      </div>

      {visibleSuggestions.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            Suggested
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleSuggestions.map((character) => (
              <button
                key={character.id}
                onClick={() => onAdd(character)}
                title={`Add ${character.name}`}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-border/60 py-1 pl-1.5 pr-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-secondary/30 hover:text-foreground"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: character.color ?? '#6366F1' }}
                />
                <span className="max-w-32 truncate">{character.name}</span>
                <Plus className="h-3 w-3 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          {characters.map((character) => (
            <div
              key={character.id}
              className="group flex items-center gap-1.5 rounded-full border border-border bg-secondary/30 py-1 pl-1.5 pr-2 text-xs"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: character.color ?? '#6366F1' }}
              />
              <span className="max-w-32 truncate">{character.name}</span>
              <button
                onClick={() => onRemove(character.id)}
                title={`Remove ${character.name}`}
                className="relative shrink-0 text-muted-foreground opacity-100 md:opacity-0 transition-opacity hover:text-destructive md:group-hover:opacity-100 after:absolute after:-inset-1.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground">
                <Plus className="h-3 w-3" />
                Add character
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 gap-0 p-0">
              <div className="relative border-b border-border p-1.5">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search characters..."
                  className="h-7 bg-background pl-6 text-xs"
                />
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-thin p-1">
                {available.length === 0 ? (
                  <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                    {allCharacters.length === 0 ? 'No characters in this project yet' : 'No matches'}
                  </p>
                ) : (
                  available.map((character) => (
                    <button
                      key={character.id}
                      onClick={() => handleSelect(character)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-secondary/50"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: character.color ?? '#6366F1' }}
                      />
                      <span className="truncate">{character.name}</span>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  )
}

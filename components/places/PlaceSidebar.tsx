'use client'

import { useState } from 'react'
import { Plus, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PlaceRow } from './PlaceRow'
import { createPlace } from '@/actions/places'
import { PLACE_TYPES } from '@/lib/places.config'
import { cn } from '@/lib/utils'
import type { PlaceType } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

interface PlaceSidebarProps {
  projectId: string
  places: PlaceWithCover[]
  totalCount: number
  search: string
  onSearchChange: (value: string) => void
  typeFilter: PlaceType | 'all'
  onTypeFilterChange: (value: PlaceType | 'all') => void
  selectedPlaceId: string | null
  onSelect: (id: string) => void
  onPlaceAdded: (place: PlaceWithCover) => void
  onPlaceColorChanged: (id: string, color: string) => void
  onPlaceDeleted: (id: string) => void
}

export function PlaceSidebar({
  projectId,
  places,
  totalCount,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  selectedPlaceId,
  onSelect,
  onPlaceAdded,
  onPlaceColorChanged,
  onPlaceDeleted,
}: PlaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [adding, setAdding] = useState(false)

  async function handleAddPlace() {
    if (adding) return
    setAdding(true)
    const created = await createPlace(projectId, `Place ${totalCount + 1}`)
    if (!('error' in created)) {
      onPlaceAdded(created)
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
            Places
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
          <div className="p-2 space-y-1.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search places..."
                className="h-7 text-xs bg-background pl-6"
              />
            </div>

            <Select value={typeFilter} onValueChange={(v) => onTypeFilterChange(v as PlaceType | 'all')}>
              <SelectTrigger className="h-7 text-xs bg-background w-full" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  All types
                </SelectItem>
                {PLACE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
            {places.length === 0 ? (
              <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
                {totalCount === 0 ? 'No places yet' : 'No places match'}
              </p>
            ) : (
              places.map((place) => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  selected={place.id === selectedPlaceId}
                  onSelect={() => onSelect(place.id)}
                  onColorChanged={(color) => onPlaceColorChanged(place.id, color)}
                  onDeleted={() => onPlaceDeleted(place.id)}
                />
              ))
            )}
          </div>

          <div className="p-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={handleAddPlace}
              disabled={adding}
            >
              {adding ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Plus className="h-3 w-3 mr-1" />
              )}
              {adding ? 'Adding...' : 'Add Place'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

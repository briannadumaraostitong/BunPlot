'use client'

import { MapPin } from 'lucide-react'
import { PlaceCard } from './PlaceCard'
import type { Chapter } from '@/types/database'
import type { PlaceWithCover } from '@/actions/places'

interface PlaceGridProps {
  places: PlaceWithCover[]
  hasAnyPlaces: boolean
  chaptersByPlaceId: Map<string, Chapter[]>
  selectedPlaceId: string | null
  onSelect: (id: string) => void
}

export function PlaceGrid({
  places,
  hasAnyPlaces,
  chaptersByPlaceId,
  selectedPlaceId,
  onSelect,
}: PlaceGridProps) {
  if (places.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center space-y-3 px-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30">
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">{hasAnyPlaces ? 'No places match' : 'No places yet'}</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {hasAnyPlaces
              ? 'Try a different search or type filter.'
              : 'Keep track of the settings and locations your story visits.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {places.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            chapters={chaptersByPlaceId.get(place.id) ?? []}
            selected={place.id === selectedPlaceId}
            onSelect={() => onSelect(place.id)}
          />
        ))}
      </div>
    </div>
  )
}

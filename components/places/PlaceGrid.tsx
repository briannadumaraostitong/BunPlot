'use client'

import { MapPin } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
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
      <EmptyState
        icon={MapPin}
        title={hasAnyPlaces ? 'No places match' : 'No places yet'}
        hint={
          hasAnyPlaces
            ? 'Try a different search or type filter.'
            : 'Keep track of the settings and locations your story visits.'
        }
        className="h-full"
      />
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

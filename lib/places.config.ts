import type { PlaceType } from '@/types/database'

export const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: 'city', label: 'City' },
  { value: 'town', label: 'Town' },
  { value: 'village', label: 'Village' },
  { value: 'building', label: 'Building' },
  { value: 'room', label: 'Room' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'world', label: 'World' },
  { value: 'other', label: 'Other' },
]

export const PLACE_TYPE_LABELS: Record<PlaceType, string> = PLACE_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<PlaceType, string>
)

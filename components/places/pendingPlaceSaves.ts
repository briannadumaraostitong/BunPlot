import { updatePlace } from '@/actions/places'
import { settle } from '@/lib/notify'
import type { PlaceType } from '@/types/database'

// Same approach as pendingOutlineSaves in OutlineEditor.tsx, in its own module
// because here the save (PlaceDetailPanel) and the refetch (PlacesPanel) live
// in different components.
//
// Tracks in-flight place saves across unmount/remount of the Places tab. The
// tab is fully unmounted when the user navigates away, so a save kicked off
// just before — PlaceRichTextEditor's unmount flush, or a name/type/color
// change — can still be in flight when the tab remounts and re-fetches places.
// Without this, the remount fetch can race the save and load the pre-save
// content. Keyed by place id and the fields being saved, since several fields
// of one place can be in flight at once; lives at module scope so it survives
// the unmount. The cover image isn't tracked: its upload flow updates local
// state itself and isn't part of this race.
const pendingPlaceSaves = new Map<string, Promise<unknown>>()

export type TrackedPlaceUpdates = Partial<{
  name: string
  type: PlaceType
  color: string
  description: Record<string, unknown>
  notes: Record<string, unknown>
}>

export function savePlaceFields(placeId: string, projectId: string, updates: TrackedPlaceUpdates) {
  const key = `${placeId}:${Object.keys(updates).sort().join(',')}`
  // Settled, so callers get { error } for a failed request too, not a rejection.
  const promise = settle(updatePlace(placeId, projectId, updates)).finally(() => {
    if (pendingPlaceSaves.get(key) === promise) {
      pendingPlaceSaves.delete(key)
    }
  })
  pendingPlaceSaves.set(key, promise)
  return promise
}

export async function waitForPendingPlaceSaves() {
  if (pendingPlaceSaves.size > 0) {
    await Promise.allSettled(pendingPlaceSaves.values())
  }
}

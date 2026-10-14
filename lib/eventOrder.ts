import type { Event } from '@/types/database'

// Position, then creation time for ties, matching the
// .order('position').order('created_at') queries, so tied events sort the
// same way in the grid, the flow view and exports. Plain module (not a hook
// file) so the server-side story bible export can use it too.
export function byPosition(
  a: Pick<Event, 'position' | 'created_at'>,
  b: Pick<Event, 'position' | 'created_at'>
) {
  return a.position - b.position || a.created_at.localeCompare(b.created_at)
}

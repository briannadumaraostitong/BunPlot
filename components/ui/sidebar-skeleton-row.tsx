import { Skeleton } from '@/components/ui/skeleton'

// Matches the shared row shape used by CharacterRow/PlaceRow/ChapterSidebar's
// row (flex items-center gap-2 mx-1 px-2 py-1.5): "circle" mirrors
// CharacterRow's h-6 w-6 avatar, "dot" mirrors PlaceRow's h-3 w-3 color dot,
// "none" mirrors ChapterSidebar's plain single-line rows.
export function SidebarRowSkeleton({ dot = 'circle' }: { dot?: 'circle' | 'dot' | 'none' }) {
  return (
    <div className="flex items-center gap-2 mx-1 px-2 py-1.5">
      {dot === 'circle' && <Skeleton className="h-6 w-6 rounded-full shrink-0" />}
      {dot === 'dot' && <Skeleton className="h-3 w-3 rounded-full shrink-0" />}
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className="h-3 w-3/4" />
        {dot !== 'none' && <Skeleton className="h-2.5 w-1/2" />}
      </div>
    </div>
  )
}

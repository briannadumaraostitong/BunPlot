import { Skeleton } from '@/components/ui/skeleton'

export function ProjectCardSkeleton() {
  return (
    <div data-slot="project-card" className="overflow-hidden rounded-xl corner-cut border border-border bg-card">
      <Skeleton className="aspect-2/3 w-full rounded-none" />
      <div className="p-3">
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

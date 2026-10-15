import { Skeleton } from '@/components/ui/skeleton'
import { ProjectCardSkeleton } from '@/components/projects/ProjectCardSkeleton'
import { COVER_GRID_CLASS } from '@/lib/coverGrid'

export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      <div className={COVER_GRID_CLASS}>
        {Array.from({ length: 10 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

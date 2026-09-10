import { Skeleton } from '@/components/ui/skeleton'

export default function ProjectLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Title bar */}
      <div className="h-10 border-b border-border flex items-center px-3 shrink-0 bg-background">
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Tab bar — shape-matched placeholders, not the real tab labels/icons,
          so this file never has to be kept in sync with ProjectView's TABS
          array (adding/renaming a tab there would otherwise silently drift
          from a literal copy here). */}
      <div className="border-b border-border px-3 shrink-0 bg-background flex items-center justify-between h-11 md:h-8">
        <div className="flex items-center gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-12 md:w-4" />
          ))}
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      {/* Timeline body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* LayerPanel-shaped sidebar */}
        <div className="hidden md:flex w-52 flex-col shrink-0 border-r border-border p-3 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full shrink-0" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Grid/Flow toggle row */}
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-secondary/20 px-3">
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>

          {/* Toolbar: search + 4 filter buttons */}
          <div className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border px-3">
            <Skeleton className="h-7 w-52 rounded-md" />
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 rounded-lg hidden md:block" />
            ))}
          </div>

          {/* Chapter header + layer tracks */}
          <div className="flex-1 overflow-hidden p-4 space-y-2">
            <div className="flex gap-0 h-10">
              <Skeleton className="w-28 shrink-0 rounded-none rounded-l-md" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-52 shrink-0 rounded-none border-l border-background" />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full rounded-lg" style={{ height: 90 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

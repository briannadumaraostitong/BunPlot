import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

// "Couldn't load <thing>" with a Retry button. The icon and Retry are what
// keep a failed load from being mistaken for an empty state. `compact` is a
// single line for fields and popovers, where the full state wouldn't fit.
export function LoadError({
  thing,
  onRetry,
  compact = false,
}: {
  thing: string
  onRetry: () => void
  compact?: boolean
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <CloudOff className="h-3 w-3 shrink-0" />
        <span>Couldn&apos;t load {thing}.</span>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px]" onClick={onRetry}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <EmptyState
      icon={CloudOff}
      title={`Couldn't load ${thing}.`}
      hint="Check your connection and try again."
      action={
        <Button size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      }
      className="h-64"
    />
  )
}

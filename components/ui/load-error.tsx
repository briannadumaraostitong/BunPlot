import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

// "Couldn't load <thing>" with a Retry button. The icon and Retry are what
// keep a failed load from being mistaken for an empty state.
export function LoadError({ thing, onRetry }: { thing: string; onRetry: () => void }) {
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

import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

// "Couldn't load <thing>" with a Retry button. Laid out like the app's empty
// states (icon circle, no box); the icon and Retry are what keep a failed load
// from being mistaken for an empty one.
export function LoadError({ thing, onRetry }: { thing: string; onRetry: () => void }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center text-center space-y-3 px-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30">
        <CloudOff className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Couldn&apos;t load {thing}.</p>
        <p className="text-xs text-muted-foreground">Check your connection and try again.</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

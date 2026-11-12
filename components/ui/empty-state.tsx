import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  hint?: string
  action?: React.ReactNode
  className?: string
  // The root's data-slot, for a theme stylesheet to restyle one spot.
  slot?: string
}

// Centered icon-circle state for empty, idle and error views: no box or
// dashed border (see CLAUDE.md). Callers set the height through className.
export function EmptyState({ icon: Icon, title, hint, action, className, slot = 'empty-state' }: EmptyStateProps) {
  return (
    <div data-slot={slot} className={cn('flex flex-col items-center justify-center text-center space-y-3 px-4', className)}>
      <div data-slot="empty-state-icon" className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p data-slot="empty-state-title" className="text-sm font-medium">{title}</p>
        {hint && <p className="text-xs text-muted-foreground max-w-xs">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

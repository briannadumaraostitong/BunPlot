import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

// The way into an inline rename on touch devices, where double-click and the
// RenameHint tooltip don't exist. Shown only there (no-hover: is
// @media (hover: none)); desktop keeps double-click. Stops propagation so a
// tap doesn't also select the row it sits in.
export function RenameButton({
  onClick,
  label = 'Rename',
  className,
}: {
  onClick: () => void
  label?: string
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      className={cn(
        'relative hidden no-hover:inline-flex shrink-0 items-center justify-center p-0.5 text-muted-foreground active:text-foreground after:absolute after:-inset-1.5',
        className
      )}
    >
      <Pencil className="h-3 w-3" />
    </button>
  )
}

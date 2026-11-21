'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export type SaveState = 'saved' | 'saving' | 'error'

// "Saving..." only shows for a save that takes longer than this, so the
// quick ones (most of them) never flash it while you write.
const SHOW_SAVING_AFTER_MS = 400
// Once shown, it stays at least this long, so it doesn't blink.
const MIN_SAVING_MS = 500

const LABELS: { state: SaveState; text: string; className: string }[] = [
  { state: 'saved', text: 'Saved ✓', className: 'text-emerald-600 dark:text-emerald-500' },
  { state: 'saving', text: 'Saving...', className: 'text-muted-foreground' },
  { state: 'error', text: 'Not saved', className: 'text-destructive' },
]

// An editor's save state, kept calm while you write. All three labels sit in
// one grid cell and only the current one is visible, so the space is always
// as wide as the widest and nothing beside it moves; they crossfade over the
// theme's quick timing (--motion-tooltip), opacity only, and swap at once
// under reduced motion. "Not saved" shows straight away. Screen readers hear
// only "Not saved" and the "Saved" that follows it, not every routine save.
// `savedSlot` is a data-slot for the "Saved" label, for a theme to restyle.
export function SaveStatus({
  status,
  savedSlot,
  className,
}: {
  status: SaveState
  savedSlot?: string
  className?: string
}) {
  const [shown, setShown] = useState<SaveState>(status)
  const [announcement, setAnnouncement] = useState('')
  const savingShownAt = useRef(0)

  useEffect(() => {
    if (status === shown) return
    const delay =
      status === 'saving'
        ? SHOW_SAVING_AFTER_MS
        : shown === 'saving'
          ? Math.max(0, MIN_SAVING_MS - (Date.now() - savingShownAt.current))
          : 0
    const timer = setTimeout(() => {
      if (status === 'saving') savingShownAt.current = Date.now()
      if (status === 'error') setAnnouncement('Not saved')
      else if (shown === 'error' && status === 'saved') setAnnouncement('Saved')
      setShown(status)
    }, delay)
    return () => clearTimeout(timer)
  }, [status, shown])

  return (
    <span className={cn('inline-grid justify-items-end', className)}>
      {LABELS.map(({ state, text, className: tone }) => (
        <span
          key={state}
          aria-hidden={state !== shown}
          data-slot={state === 'saved' ? savedSlot : undefined}
          className={cn(
            'col-start-1 row-start-1 whitespace-nowrap transition-opacity duration-(--motion-tooltip) ease-[ease] motion-reduce:transition-none',
            tone,
            state === shown ? 'opacity-100' : 'opacity-0'
          )}
        >
          {text}
        </span>
      ))}
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </span>
  )
}

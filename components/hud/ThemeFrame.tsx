import { cn } from '@/lib/utils'
import type { ThemeFrames } from '@/lib/themes'
import type { FrameName, FRAMES } from '@/lib/frames'
import { Frame, FrameSlot } from './Frame'

// A framed spot that follows the theme's `frames` setting (lib/themes.ts):
// with 'nightcity' it's that Nightcity frame, with its content placed in the
// frame's measured areas; with null it's a plain card from theme tokens
// (rounded, or cut under a cut theme), its slots stacked in normal flow. Pass
// the same `frames` to the ThemeFrameSlots inside. Server components: the
// setting comes in as a prop, not from context.

type Frames = ThemeFrames | null

export function ThemeFrame({
  frames,
  name,
  className,
  plainClassName,
  children,
}: {
  frames: Frames
  name: FrameName
  className?: string
  // Layout for the plain card only (padding, gaps), on top of its surface.
  plainClassName?: string
  children?: React.ReactNode
}) {
  if (frames === 'nightcity') return <Frame name={name} className={className}>{children}</Frame>
  return (
    <div data-slot="frame-card" className={cn('flex flex-col gap-4 rounded-xl corner-cut border border-border bg-card p-6', className, plainClassName)}>
      {children}
    </div>
  )
}

export function ThemeFrameSlot<N extends FrameName>({
  frames,
  frame,
  slot,
  className,
  plainClassName,
  children,
}: {
  frames: Frames
  frame: N
  slot?: keyof (typeof FRAMES)[N]['slots']
  className?: string
  // Classes for the plain card only, e.g. to undo a size the frame needs.
  plainClassName?: string
  children?: React.ReactNode
}) {
  if (frames === 'nightcity') return <FrameSlot frame={frame} slot={slot} className={className}>{children}</FrameSlot>
  return <div className={cn(className, plainClassName)}>{children}</div>
}

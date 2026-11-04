import Image from 'next/image'
import { cn } from '@/lib/utils'
import { FRAMES, type FrameInset, type FrameName } from '@/lib/frames'

// A framed spot that follows the theme's `frames` setting (lib/themes.ts),
// which the page carries as data-frames (on <html>, or on a ThemeScope).
// Under 'nightcity' it's that Nightcity frame at its own aspect ratio, with
// content placed in the frame's measured areas; with no frame set it's a
// plain card from theme tokens (rounded, or cut under a cut theme), its slots
// stacked in normal flow. Both are in the markup and CSS picks one, through
// the frames: and plain: variants (globals.css), since the server doesn't
// know the visitor's theme. Classes for one look only go under those
// variants, e.g. `plain:border-b` or `frames:text-right`.
//
// The frame image is lazy and hidden in the plain look, so plain themes
// never download it. Shown as a frame, the spot is a size container, so text
// inside can be sized in cqw.

const PLAIN_CARD = 'plain:flex plain:flex-col plain:gap-4 plain:rounded-xl plain:border plain:border-border plain:bg-card plain:p-6'

// Widths below which a spot shows its fallback even under a frame set, so
// text isn't squeezed into the frame's slots. Container queries need literal
// values, hence a fixed list.
const MIN_WIDTH = {
  280: { frame: 'frames:@min-[280px]/frame-spot:block', fallback: 'frames:@min-[280px]/frame-spot:hidden' },
  320: { frame: 'frames:@min-[320px]/frame-spot:block', fallback: 'frames:@min-[320px]/frame-spot:hidden' },
} as const

type ThemeFrameProps = {
  name: FrameName
  className?: string
  children?: React.ReactNode
} & (
  // The plain look is a card built from the slots.
  | { plain?: 'card'; fallback?: never; minWidth?: never }
  // No plain card: in the plain look the frame is hidden and `fallback` (the
  // spot's own markup, e.g. an EmptyState) shows instead, exactly as it would
  // without a frame: its wrapper is display: contents. `minWidth` also shows
  // the fallback when the spot is narrower than that.
  | { plain: 'none'; fallback: React.ReactNode; minWidth?: keyof typeof MIN_WIDTH }
)

export function ThemeFrame({ name, className, children, plain = 'card', fallback, minWidth }: ThemeFrameProps) {
  const spec = FRAMES[name]
  const narrow = minWidth ? MIN_WIDTH[minWidth] : null
  const frame = (
    <div
      data-slot="frame"
      // corner-cut: the plain card's corners under a cut theme; globals.css
      // drops the clip when the frame shows.
      className={cn(
        'relative corner-cut frames:@container frames:aspect-(--frame-ratio)',
        plain === 'card' ? PLAIN_CARD : cn('hidden', narrow?.frame ?? 'frames:block'),
        className
      )}
      style={{ '--frame-ratio': `${spec.width} / ${spec.height}` } as React.CSSProperties}
    >
      <Image src={spec.src} alt="" aria-hidden="true" fill unoptimized className="hidden frames:block" />
      {children}
    </div>
  )
  if (plain === 'card') return frame

  const shown = <div className={cn('contents', narrow?.fallback ?? 'frames:hidden')}>{fallback}</div>
  // The width check needs a container around both; without one, nothing is
  // added around the fallback.
  return narrow ? (
    <div className="@container/frame-spot">
      {frame}
      {shown}
    </div>
  ) : (
    <>
      {frame}
      {shown}
    </>
  )
}

// Each inset as a variable the frames: classes read; one a slot doesn't set
// stays unset, so that side is auto.
const insetVars = (inset: FrameInset) =>
  Object.fromEntries(Object.entries(inset).map(([side, value]) => [`--slot-${side}`, `${value}%`])) as React.CSSProperties

const SLOT_POSITION =
  'frames:absolute frames:left-(--slot-left) frames:right-(--slot-right) frames:top-(--slot-top) frames:bottom-(--slot-bottom) frames:w-(--slot-width) frames:h-(--slot-height)'

// Content for one of the frame's measured areas (default `content`): placed
// there as a frame, in flow in the plain card. Takes the frame's name rather
// than reading it from <ThemeFrame>, so both stay server components.
export function ThemeFrameSlot<N extends FrameName>({
  frame,
  slot = 'content',
  className,
  children,
}: {
  frame: N
  slot?: keyof (typeof FRAMES)[N]['slots']
  className?: string
  children?: React.ReactNode
}) {
  const inset = (FRAMES[frame].slots as Record<string, FrameInset>)[slot as string]
  return (
    <div className={cn(SLOT_POSITION, className)} style={insetVars(inset)}>
      {children}
    </div>
  )
}

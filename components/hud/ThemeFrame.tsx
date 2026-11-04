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

export function ThemeFrame({ name, className, children }: { name: FrameName; className?: string; children?: React.ReactNode }) {
  const spec = FRAMES[name]
  return (
    <div
      data-slot="frame"
      // corner-cut: the plain card's corners under a cut theme; globals.css
      // drops the clip when the frame shows.
      className={cn('relative corner-cut frames:@container frames:aspect-(--frame-ratio)', PLAIN_CARD, className)}
      style={{ '--frame-ratio': `${spec.width} / ${spec.height}` } as React.CSSProperties}
    >
      <Image src={spec.src} alt="" aria-hidden="true" fill unoptimized className="hidden frames:block" />
      {children}
    </div>
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

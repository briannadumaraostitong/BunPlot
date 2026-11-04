import Image from 'next/image'
import { cn } from '@/lib/utils'
import { FRAMES, type FrameInset, type FrameName } from '@/lib/frames'

// A Nightcity frame at its own aspect ratio (never stretched), with children
// positioned in its measured areas via <FrameSlot>. The frame is decorative,
// so the image is hidden from assistive tech. It's a size container, so text
// inside can be sized in cqw and scale with the frame on narrow screens.
export function Frame({ name, className, children }: { name: FrameName; className?: string; children?: React.ReactNode }) {
  const spec = FRAMES[name]
  return (
    <div data-slot="frame" className={cn('@container relative', className)} style={{ aspectRatio: `${spec.width} / ${spec.height}` }}>
      <Image src={spec.src} alt="" aria-hidden="true" fill unoptimized />
      {children}
    </div>
  )
}

const toStyle = (inset: FrameInset): React.CSSProperties =>
  Object.fromEntries(Object.entries(inset).map(([side, value]) => [side, `${value}%`]))

// Places its children in one of a frame's measured areas (default `content`).
// Takes the frame's name rather than reading it from <Frame>, so both stay
// server components.
export function FrameSlot<N extends FrameName>({
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
    <div className={cn('absolute', className)} style={toStyle(inset)}>
      {children}
    </div>
  )
}

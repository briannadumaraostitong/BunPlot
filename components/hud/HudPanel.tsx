import { cn } from '@/lib/utils'

// The hero's HUD panel, built in CSS rather than from a frame (frames can't
// stretch, and this sizes to its content): a 2px cyan border following the
// clipped outline, a pink rail on the left, a header bar with pink slashes,
// and an optional 16-segment progress bar. Cyberpunk colors: render it inside
// the Cyberpunk theme (e.g. a ThemeScope).

// The outline: notched top-right and bottom-left corners, and a recess on the
// right edge. The border is the outer layer showing 2px around the inner one.
const HUD_CLIP =
  '[clip-path:polygon(0_0,calc(100%-30px)_0,100%_30px,100%_calc(100%-96px),calc(100%-8px)_calc(100%-88px),calc(100%-8px)_calc(100%-40px),100%_calc(100%-32px),100%_100%,30px_100%,0_calc(100%-30px))]'

const SEGMENTS = 16

interface HudPanelProps {
  title: string
  // The right-hand label in the header bar.
  tag?: string
  // Filled segments out of 16, with labels shown after the bar.
  progress?: { filled: number; labels?: React.ReactNode }
  // Boots up as it appears (components/landing/motion.css): the frame wipes
  // in from the top, the rail grows down, then the filled segments light up
  // in turn. For the landing hero's picture only, never a panel holding a
  // form (the auth pages'). It also marks the panel as the hero picture
  // LandingReveals waits for on phones.
  boot?: boolean
  className?: string
  children: React.ReactNode
}

export function HudPanel({ title, tag, progress, boot = false, className, children }: HudPanelProps) {
  return (
    <div data-reveal={boot ? 'hero' : undefined} className={cn('relative pl-[18px]', boot && 'hud-boot', className)}>
      <div aria-hidden="true" className={cn('absolute left-0 top-10 bottom-10 w-2 bg-accent', boot && 'hud-boot-rail')} />
      <div className={cn(HUD_CLIP, 'bg-accent-2 p-[2px]')}>
        <div className={cn(HUD_CLIP, 'bg-(--hud-panel)')}>
          <div className="flex items-center gap-3.5 border-b-2 border-accent-2 bg-(--hud-header) py-3.5 pr-11 pl-[22px]">
            <svg aria-hidden="true" width="46" height="14" viewBox="0 0 46 14" className="shrink-0">
              <path d="M0 14L6 0h6L6 14zM12 14L18 0h6l-6 14zM24 14L30 0h6l-6 14z" className="fill-accent" />
            </svg>
            <span className="min-w-0 flex-1 font-mono text-[13px] tracking-[1px] text-foreground">{title}</span>
            {tag && <span className="font-mono text-[12px] text-accent-2">{tag}</span>}
          </div>

          <div className="pt-[22px] pr-[30px] pb-[18px] pl-[22px]">
            {children}

            {progress && (
              <div className="mt-5 flex items-center gap-3.5 border-t border-border pt-3.5">
                <div aria-hidden="true" className="grid flex-1 grid-cols-16 gap-[3px]">
                  {Array.from({ length: SEGMENTS }, (_, i) =>
                    i < progress.filled ? (
                      // Booting, each lights up after the one before (--segment).
                      <span
                        key={i}
                        className={cn('h-2 bg-accent', boot && 'hud-boot-segment')}
                        style={boot ? ({ '--segment': i } as React.CSSProperties) : undefined}
                      />
                    ) : (
                      <span key={i} className="h-2 border border-(--hud-segment)" />
                    )
                  )}
                </div>
                {progress.labels}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

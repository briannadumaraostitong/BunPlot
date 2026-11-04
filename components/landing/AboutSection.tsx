import type { ThemeFrames } from '@/lib/themes'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { BAND, BODY, CONTAINER, H2, SECTION_EYEBROW, SPLIT, SPLIT_TEXT } from './layout'

export function AboutSection({ frames }: { frames: ThemeFrames | null }) {
  return (
    <section id="about" className={BAND}>
      <div className={`${CONTAINER} ${SPLIT} gap-y-12 py-[104px]`}>
        <div className={SPLIT_TEXT}>
          <Eyebrow number="03" className={SECTION_EYEBROW}>About</Eyebrow>
          <h2 className={`mb-5 ${H2}`}>Made for people who organize</h2>
          {/* Placeholder text and name, kept visible until the owner replaces them. */}
          <p className={BODY}>
            I built BunPlot because I need to see how everything in a story fits together, and I couldn&apos;t find a tool
            that kept it all in one place. If you organize the way I do, it&apos;s for you too. — [YOUR NAME]
          </p>
        </div>

        <div
          role="img"
          aria-label="A terminal: open project, 12 chapters, 48 events, 9 characters; status, everything in its place"
          className="min-w-0 max-w-[520px] flex-[1_1_440px]"
        >
          <ThemeFrame frames={frames} name="terminal" className="w-full">
            <ThemeFrameSlot
              frames={frames}
              frame="terminal"
              className="flex flex-col justify-center gap-2.5 font-mono text-[14px] leading-[1.5] text-secondary-foreground"
            >
              <span><span className="text-accent-2">&gt;</span> open project</span>
              <span className="text-primary">12 chapters · 48 events · 9 characters</span>
              <span><span className="text-accent-2">&gt;</span> status</span>
              <span className="text-primary">everything in its place</span>
              <span className="text-accent">█</span>
            </ThemeFrameSlot>
          </ThemeFrame>
        </div>
      </div>
    </section>
  )
}

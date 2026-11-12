import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { ABOUT, PROJECT } from '../content'
import { CONTAINER } from '../layout'
import { BAND, BODY, H2, SECTION_EYEBROW, SPLIT, SPLIT_TEXT, sectionNumber } from './styles'

export function AboutSection() {
  return (
    <section id="about" className={BAND}>
      <div className={`${CONTAINER} ${SPLIT} gap-y-12 py-[104px]`}>
        <div className={SPLIT_TEXT}>
          <Eyebrow number={sectionNumber(ABOUT.number)} className={SECTION_EYEBROW}>{ABOUT.label}</Eyebrow>
          <h2 className={`mb-5 ${H2}`}>{ABOUT.title}</h2>
          <p className={BODY}>{`${ABOUT.body} — ${ABOUT.signature}`}</p>
        </div>

        <div
          role="img"
          aria-label="A terminal: open project, 12 chapters, 48 events, 9 characters; status, everything in its place"
          className="min-w-0 max-w-[520px] flex-[1_1_440px]"
        >
          <ThemeFrame name="terminal" className="w-full">
            <ThemeFrameSlot
              frame="terminal"
              className="flex flex-col justify-center gap-2.5 font-mono text-[14px] leading-[1.5] text-secondary-foreground"
            >
              <span><span className="text-accent-2">&gt;</span> open project</span>
              <span className="text-primary">{`${PROJECT.chapters} chapters · ${PROJECT.events} events · ${PROJECT.characters} characters`}</span>
              <span><span className="text-accent-2">&gt;</span> status</span>
              <span className="text-primary">{ABOUT.status}</span>
              <span className="text-accent">█</span>
            </ThemeFrameSlot>
          </ThemeFrame>
        </div>
      </div>
    </section>
  )
}

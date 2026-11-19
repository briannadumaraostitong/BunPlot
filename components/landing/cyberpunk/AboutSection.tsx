import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { ABOUT, PROJECT } from '../content'
import { CONTAINER } from '../layout'
import { BAND, BODY, H2, SECTION_EYEBROW, SPLIT, SPLIT_TEXT, sectionNumber } from './styles'

// The terminal's two commands. It plays once the picture has revealed
// (motion.css): each command types out, its output appears at once after a
// short pause, and the pink cursor ends on the last line, where it sits.
// Their lengths set the timing (--cmd1, --cmd2; --n for each one's typing).
const OPEN = 'open project'
const STATUS = 'status'

export function AboutSection() {
  return (
    <section id="about" className={BAND}>
      <div className={`${CONTAINER} ${SPLIT} gap-y-12 py-[104px]`}>
        <div data-reveal className={SPLIT_TEXT}>
          <Eyebrow number={sectionNumber(ABOUT.number)} className={SECTION_EYEBROW}>{ABOUT.label}</Eyebrow>
          <h2 className={`mb-5 ${H2}`}>{ABOUT.title}</h2>
          <p className={BODY}>{`${ABOUT.body} — ${ABOUT.signature}`}</p>
        </div>

        <div
          data-reveal
          role="img"
          aria-label="A terminal: open project, 12 chapters, 48 events, 9 characters; status, everything in its place"
          className="min-w-0 max-w-[520px] flex-[1_1_440px]"
          style={{ '--cmd1': OPEN.length, '--cmd2': STATUS.length } as React.CSSProperties}
        >
          <ThemeFrame name="terminal" className="w-full">
            <ThemeFrameSlot
              frame="terminal"
              className="cyberpunk-term flex flex-col justify-center gap-2.5 font-mono text-[14px] leading-[1.5] text-secondary-foreground"
            >
              <span className="cyberpunk-term-cmd1 relative" style={{ '--n': OPEN.length } as React.CSSProperties}>
                <span className="text-accent-2">&gt;</span> <span className="cyberpunk-term-typed">{OPEN}</span>
              </span>
              <span className="cyberpunk-term-out1 text-primary">{`${PROJECT.chapters} chapters · ${PROJECT.events} events · ${PROJECT.characters} characters`}</span>
              <span className="cyberpunk-term-cmd2 relative" style={{ '--n': STATUS.length } as React.CSSProperties}>
                <span className="text-accent-2">&gt;</span> <span className="cyberpunk-term-typed">{STATUS}</span>
              </span>
              <span className="cyberpunk-term-out2 text-primary">{ABOUT.status}</span>
              <span className="cyberpunk-term-cursor text-accent">█</span>
            </ThemeFrameSlot>
          </ThemeFrame>
        </div>
      </div>
    </section>
  )
}

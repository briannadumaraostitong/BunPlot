import Link from 'next/link'
import { HERO, PROJECT, TIMELINE } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { HEADING, ITALIC_EYEBROW, LABEL, RULED, SHEET, roman } from './styles'

// Each storyline's top rule, keyed by the lane's tone (accent 1, 2 or 3):
// oxblood, ink blue, olive.
const RULE = { 1: 'border-t-accent', 2: 'border-t-accent-2', 3: 'border-t-accent-3' } as const

const GRID = 'grid grid-cols-[72px_repeat(4,minmax(0,1fr))]'
const LANE_LABEL = 'font-heading text-[16px] text-muted-foreground'

const CHAPTERS = Array.from({ length: TIMELINE.chapters }, (_, i) => `Ch. ${roman(i + 1)}`)
const MARKS = Array.from({ length: PROJECT.draft.of }, (_, i) => i < PROJECT.draft.done)

// The ledger footer's labels, typed in after the ribbon (motion.css).
const DRAFT_LABEL = `Draft ${PROJECT.draft.done} of ${PROJECT.draft.of}`
const SAVED_LABEL = 'Saved ✓'

export function Hero() {
  return (
    <section className={`${CONTAINER} flex flex-wrap items-center gap-14 pt-10 md:pt-24 pb-[88px]`}>
      <div className="min-w-0 flex-[1_1_420px]">
        <p className={`mb-3.5 text-[22px] ${ITALIC_EYEBROW}`}>{HERO.eyebrow}</p>
        <h1 className={`mb-[26px] text-[84px] leading-[0.95] ${HEADING}`}>
          {`${HERO.title.lead} `}
          <span className="relative whitespace-nowrap italic text-accent">
            {`${HERO.title.highlight}.`}
            {/* The hand-drawn underline. It draws itself as the page loads
                (motion.css; pathLength sets its dashes' scale). */}
            <svg
              aria-hidden="true"
              viewBox="0 0 220 18"
              preserveAspectRatio="none"
              className="absolute bottom-[-10px] left-0 h-4 w-[92%]"
            >
              <path
                d="M3 12C40 4 90 3 130 7s70 6 87-2"
                pathLength={1}
                fill="none"
                className="manuscript-hero-underline stroke-accent"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>
        <p className="mb-[34px] max-w-[500px] text-[19px] leading-[1.7]">{HERO.body}</p>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            {HERO.primary}
          </Link>
          <a href="#features" className={CTA.text}>
            {`${HERO.secondary} →`}
          </a>
        </div>
      </div>

      {/* The ledger: a picture of the timeline, not data. On phones it waits
          to be scrolled into view, then rises in (motion.css). */}
      <div
        data-reveal="hero"
        role="img"
        aria-label="A sample timeline: three storylines across four chapters"
        className="manuscript-hero-ledger relative min-w-0 max-w-[640px] flex-[1_1_540px]"
      >
        <div aria-hidden="true" className={`relative overflow-hidden ${SHEET}`}>
          {/* The bookmark ribbon: short enough that its tip stays above the
              chapter labels and event cards. It drops in from the sheet's top
              edge (motion.css). */}
          <div className="manuscript-hero-ribbon absolute top-0 right-10 z-2 h-[72px] w-[22px] bg-accent [clip-path:polygon(0_0,100%_0,100%_100%,50%_84%,0_100%)]" />
          <div className="flex items-baseline gap-3.5 border-b border-border pt-[18px] pr-[92px] pb-3.5 pl-6">
            <span className={`flex-1 text-[24px] italic ${HEADING}`}>{PROJECT.title}</span>
            <span className={LABEL}>Timeline</span>
          </div>
          <div className={`relative py-[18px] pr-[26px] pl-6 ${RULED}`}>
            {/* The double red margin line. */}
            <div className="absolute top-0 bottom-0 left-[98px] border-l-3 border-double border-l-[hsl(var(--accent-border))]" />
            <div className={`${GRID} mb-2.5 gap-x-2.5 gap-y-2`}>
              <span />
              {CHAPTERS.map((ch) => (
                <span key={ch} className={`${LANE_LABEL} italic`}>{ch}</span>
              ))}
            </div>
            <div className={`${GRID} items-center gap-2.5`}>
              {TIMELINE.lanes.map(({ label, tone, cells }) => (
                <LaneRow key={label} label={label} rule={RULE[tone]} cells={cells} />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-border px-6 py-3">
            <div className="flex flex-[1_1_200px] gap-1">
              {MARKS.map((filled, i) => (
                <span
                  key={i}
                  className={`h-3.5 w-2.5 rounded-[1px] ${filled ? 'bg-accent-2' : 'border border-[hsl(var(--rule))]'}`}
                />
              ))}
            </div>
            {/* Typed in like a typewriter once the ribbon has dropped
                (motion.css): each label one text node, clipped a character
                at a time (--n, its length). */}
            <span
              className="manuscript-hero-draft font-mono text-[13px] text-muted-foreground"
              style={{ '--n': DRAFT_LABEL.length } as React.CSSProperties}
            >
              <span className="manuscript-hero-typed">{DRAFT_LABEL}</span>
            </span>
            <span
              className="manuscript-hero-saved font-mono text-[13px] font-bold text-accent-3"
              style={{ '--n': SAVED_LABEL.length } as React.CSSProperties}
            >
              <span className="manuscript-hero-typed">{SAVED_LABEL}</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function LaneRow({ label, rule, cells }: { label: string; rule: string; cells: readonly (string | null)[] }) {
  return (
    <>
      <span className={LANE_LABEL}>{label}</span>
      {cells.map((title, i) =>
        title ? (
          <span
            key={i}
            className={`rounded-[2px] border border-[hsl(var(--rule-light))] border-t-3 bg-[hsl(var(--index-card))] px-2.5 py-2 text-[14px] text-foreground ${rule}`}
          >
            {title}
          </span>
        ) : (
          <span key={i} />
        )
      )}
    </>
  )
}

import Link from 'next/link'
import { HERO, PROJECT, TIMELINE } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { CARD, EYEBROW, HEADING, STRONG, TAG, TAG_BLUE, TAG_NEUTRAL, TAG_OUTLINE, WINDOW_DOTS } from './styles'

// Each storyline's event tags, keyed by the lane's tone: blue for Main,
// neutral for Ilsa, taupe-outlined for Letters (the outline takes 2px of the
// padding).
const CELL = { 1: `${TAG_BLUE} py-2`, 2: `${TAG_NEUTRAL} py-2`, 3: `${TAG_OUTLINE} py-1.5` } as const

const GRID = 'grid grid-cols-[72px_repeat(4,minmax(0,1fr))] gap-2.5'
const LANE_LABEL = 'text-[14px] font-extrabold text-muted-foreground'

const CHAPTERS = Array.from({ length: TIMELINE.chapters }, (_, i) => `Ch. ${i + 1}`)

// The event that types itself into Ilsa's empty Ch. 4 cell once the window
// is in, before "Saved ✓" appears (motion.css). Classic's own copy.
const NEW_EVENT = { lane: 'Ilsa', chapter: 4, title: 'Crosses back' }

export function Hero() {
  return (
    <section className={`${CONTAINER} flex flex-wrap items-center gap-16 pt-10 md:pt-24 pb-[104px]`}>
      <div className="min-w-0 flex-[1_1_420px]">
        <p className={`mb-[22px] ${EYEBROW}`}>{HERO.eyebrow}</p>
        <h1 className={`mb-6 text-[78px] leading-none ${HEADING}`}>
          {`${HERO.title.lead} `}
          <span className="text-link">{HERO.title.highlight}</span>.
        </h1>
        <p className="mb-[34px] max-w-[500px] text-[20px] leading-[1.65]">{HERO.body}</p>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            {HERO.primary}
          </Link>
          <a href="#features" className={CTA.text}>
            {HERO.secondary}
          </a>
        </div>
      </div>

      <div className="ml-auto min-w-0 max-w-[600px] flex-[1_1_520px]">
        {/* An app window showing the timeline: a picture, not data. */}
        <div
          role="img"
          aria-label={`A timeline for ${PROJECT.title}: ${TIMELINE.chapters} chapters and ${TIMELINE.lanes.length} storylines, Main, Ilsa and Letters, with events such as The flood, Bridge falls and Meets Tobin, and a new one, ${NEW_EVENT.title}. Draft ${PROJECT.draft.done} of ${PROJECT.draft.of}, saved.`}
          // Rises in as the page loads, or on phones as it scrolls into view
          // (motion.css, LandingReveals).
          data-reveal="hero"
          className={`classic-hero-window overflow-hidden ${CARD}`}
        >
          <div className="flex items-center gap-3 border-b border-border px-[22px] py-4">
            <span className="flex gap-1.5">
              {WINDOW_DOTS.map((dot) => (
                <span key={dot} className={`size-[11px] rounded-full ${dot}`} />
              ))}
            </span>
            <span className={`flex-1 text-[17px] ${STRONG}`}>{PROJECT.title}</span>
            <span className={`${TAG} ${TAG_NEUTRAL} px-3 py-1`}>Timeline</span>
          </div>
          <div className="px-[22px] pt-5 pb-[22px]">
            <div className={`${GRID} mb-3 text-[13px] font-extrabold text-muted-foreground`}>
              <span />
              {CHAPTERS.map((ch) => (
                <span key={ch}>{ch}</span>
              ))}
            </div>
            <div className={`${GRID} items-center`}>
              {TIMELINE.lanes.map(({ label, tone, cells }) => (
                <LaneRow key={label} label={label} cell={CELL[tone]} cells={cells} newEvent={label === NEW_EVENT.lane ? NEW_EVENT : undefined} />
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[hsl(var(--tag-neutral))]">
                {/* Fills once the window is in (motion.css). */}
                <div
                  className="classic-hero-progress h-full rounded-[3px] bg-[hsl(var(--taupe))]"
                  style={{ width: `${(PROJECT.draft.done / PROJECT.draft.of) * 100}%` }}
                />
              </div>
              <span className="text-[14px] font-bold text-muted-foreground">{`Draft ${PROJECT.draft.done} of ${PROJECT.draft.of}`}</span>
              {/* Appears once the new event has typed in (motion.css). */}
              <span className={`classic-hero-saved text-[14px] ${STRONG}`}>Saved ✓</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function LaneRow({
  label,
  cell,
  cells,
  newEvent,
}: {
  label: string
  cell: string
  cells: readonly (string | null)[]
  newEvent?: typeof NEW_EVENT
}) {
  return (
    <>
      <span className={LANE_LABEL}>{label}</span>
      {cells.map((title, i) =>
        title ? (
          <span key={i} className={`${TAG} px-1.5 text-center ${cell}`}>
            {title}
          </span>
        ) : newEvent?.chapter === i + 1 ? (
          // One span per character, each appearing in turn (--char); they hold
          // their places from the start, so the typing moves nothing.
          <span key={i} className={`classic-hero-new ${TAG} px-1.5 text-center ${cell}`}>
            {[...newEvent.title].map((char, j) => (
              <span key={j} className="classic-hero-char" style={{ '--char': j } as React.CSSProperties}>
                {char}
              </span>
            ))}
          </span>
        ) : (
          <span key={i} />
        )
      )}
    </>
  )
}

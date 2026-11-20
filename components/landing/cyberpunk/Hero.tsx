import Link from 'next/link'
import { HudPanel } from '@/components/hud/HudPanel'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { HERO, PROJECT, TIMELINE } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { sectionNumber } from './styles'

// Event chips in the mock timeline: a tint of the storyline's accent mixed
// into the page background, a 3px bar in the accent, and a light tint for the
// text, as the app's event cards do with a layer color. Keyed by the lane's
// tone (accent 1, 2 or 3).
const CHIP = {
  1: 'border-l-accent bg-[color-mix(in_srgb,hsl(var(--accent))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent))_18%,white)]',
  2: 'border-l-accent-2 bg-[color-mix(in_srgb,hsl(var(--accent-2))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent-2))_22%,white)]',
  3: 'border-l-accent-3 bg-[color-mix(in_srgb,hsl(var(--accent-3))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent-3))_30%,white)]',
} as const

// On phones the lane labels move to their own row above each lane, so the
// four chapter columns get the panel's whole width and the chips' words fit.
const GRID = 'grid grid-cols-[72px_repeat(4,minmax(0,1fr))] gap-2 max-sm:grid-cols-4 max-sm:gap-1'
const MONO_LABEL = 'font-mono text-[11px] uppercase text-muted-foreground'

// The progress row's labels, typed in like a terminal line after the boot-up
// (motion.css): each stays one text node, clipped a character at a time.
const DRAFT_LABEL = `DRAFT ${PROJECT.draft.done}/${PROJECT.draft.of}`
const SAVED_LABEL = 'SAVED ✓'

const CHAPTERS = Array.from({ length: TIMELINE.chapters }, (_, i) => `CH ${sectionNumber(i + 1)}`)

export function Hero() {
  return (
    <section className={`${CONTAINER} flex flex-wrap items-center gap-14 pt-10 md:pt-24 pb-[88px]`}>
      <div className="min-w-0 flex-[1_1_420px]">
        <Eyebrow className="mb-[18px]">{HERO.eyebrow}</Eyebrow>
        <h1 className="mb-6 font-heading text-[76px] font-bold leading-[0.95] tracking-[2px] text-primary uppercase">
          {HERO.title.lead}
          <br />
          <span className="text-accent">{HERO.title.highlight}</span>
          {/* Blinks a few times as the page loads (motion.css). */}
          <span className="cyberpunk-hero-cursor text-accent-2">_</span>
        </h1>
        <p className="mb-[34px] max-w-[500px] text-[19px] leading-[1.6] text-(--hud-text-body)">{HERO.body}</p>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            {HERO.primary}
          </Link>
          <a href="#features" className={CTA.text}>
            {`${HERO.secondary} ›`}
          </a>
        </div>
      </div>

      <HudPanel
        title={PROJECT.title.toUpperCase()}
        tag="TIMELINE"
        // Boots up as the page loads, or on phones as it scrolls into view.
        boot
        // The mockup's 540/640px content width plus the panel's 18px rail.
        className="min-w-0 max-w-[658px] flex-[1_1_558px]"
        progress={{
          filled: PROJECT.draft.done,
          labels: (
            <>
              <span
                className="cyberpunk-hero-draft relative whitespace-nowrap font-mono text-[11px] text-muted-foreground"
                style={{ '--n': DRAFT_LABEL.length } as React.CSSProperties}
              >
                <span className="cyberpunk-hero-typed">{DRAFT_LABEL}</span>
              </span>
              <span
                className="cyberpunk-hero-saved relative whitespace-nowrap font-mono text-[11px] text-accent-2"
                style={{ '--n': SAVED_LABEL.length } as React.CSSProperties}
              >
                <span className="cyberpunk-hero-typed">{SAVED_LABEL}</span>
              </span>
            </>
          ),
        }}
      >
        {/* A picture of the timeline, not data: one description for screen readers. */}
        <div role="img" aria-label="A sample timeline: three storylines across four chapters">
          <div aria-hidden="true" className={`${GRID} mb-2.5 ${MONO_LABEL}`}>
            <span className="max-sm:hidden" />
            {CHAPTERS.map((ch) => (
              <span key={ch}>{ch}</span>
            ))}
          </div>
          <div aria-hidden="true" className={GRID}>
            {TIMELINE.lanes.map(({ label, tone, cells }) => (
              <LaneRow key={label} label={label} chip={CHIP[tone]} cells={cells} />
            ))}
          </div>
        </div>
      </HudPanel>
    </section>
  )
}

function LaneRow({ label, chip, cells }: { label: string; chip: string; cells: readonly (string | null)[] }) {
  return (
    <>
      <span className={`${MONO_LABEL} self-center max-sm:col-span-full max-sm:mt-1.5`}>{label}</span>
      {cells.map((title, i) =>
        title ? (
          <span key={i} className={`border-l-3 px-2.5 py-[9px] text-[14px] max-sm:px-1 max-sm:py-1.5 max-sm:text-[11px] max-sm:leading-tight ${chip}`}>
            {title}
          </span>
        ) : (
          <span key={i} />
        )
      )}
    </>
  )
}

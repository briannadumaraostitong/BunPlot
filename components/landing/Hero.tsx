import Link from 'next/link'
import { HudPanel } from '@/components/hud/HudPanel'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { CTA } from './cta'
import { CONTAINER } from './layout'

// Event chips in the mock timeline: a tint of the storyline's accent mixed
// into the page background, a 3px bar in the accent, and a light tint for the
// text, as the app's event cards do with a layer color.
const CHIP = {
  pink: 'border-l-accent bg-[color-mix(in_srgb,hsl(var(--accent))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent))_18%,white)]',
  cyan: 'border-l-accent-2 bg-[color-mix(in_srgb,hsl(var(--accent-2))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent-2))_22%,white)]',
  violet: 'border-l-accent-3 bg-[color-mix(in_srgb,hsl(var(--accent-3))_14%,hsl(var(--background)))] text-[color-mix(in_srgb,hsl(var(--accent-3))_30%,white)]',
} as const

// Example data for the mock UI, as in the mockup: one row per storyline, one
// cell per chapter (null for an empty cell).
const LANES: { label: string; tone: keyof typeof CHIP; cells: (string | null)[] }[] = [
  { label: 'Main', tone: 'pink', cells: ['The flood', null, 'Bridge falls', 'Return'] },
  { label: 'Ilsa', tone: 'cyan', cells: [null, 'Finds the map', 'Meets Tobin', null] },
  { label: 'Letters', tone: 'violet', cells: ['First letter', null, null, 'The reply'] },
]

const GRID = 'grid grid-cols-[72px_repeat(4,minmax(0,1fr))] gap-2'
const MONO_LABEL = 'font-mono text-[11px] uppercase text-muted-foreground'

export function Hero() {
  return (
    <section className={`${CONTAINER} flex flex-wrap items-center gap-14 pt-24 pb-[88px]`}>
      <div className="min-w-0 flex-[1_1_420px]">
        <Eyebrow className="mb-[18px]">For writers who need to organize</Eyebrow>
        <h1 className="mb-6 font-heading text-[76px] font-bold leading-[0.95] tracking-[2px] text-primary uppercase">
          Plot every
          <br />
          <span className="text-accent">thread</span>
          <span className="text-accent-2">_</span>
        </h1>
        <p className="mb-[34px] max-w-[500px] text-[19px] leading-[1.6] text-(--hud-text-body)">
          Your timeline, outline, characters and places, organized in one workspace and connected to each other, from the
          first idea to the finished book.
        </p>
        <div className="flex flex-wrap items-center gap-3.5">
          <Link href="/signup" className={CTA.primary}>
            Start organizing
          </Link>
          <a href="#features" className={CTA.text}>
            See how it works ›
          </a>
        </div>
      </div>

      <HudPanel
        title="THE DROWNED BRIDGE"
        tag="TIMELINE"
        // The mockup's 540/640px content width plus the panel's 18px rail.
        className="min-w-0 max-w-[658px] flex-[1_1_558px]"
        progress={{
          filled: 10,
          labels: (
            <>
              <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">DRAFT 10/16</span>
              <span className="whitespace-nowrap font-mono text-[11px] text-accent-2">SAVED ✓</span>
            </>
          ),
        }}
      >
        {/* A picture of the timeline, not data: one description for screen readers. */}
        <div role="img" aria-label="A sample timeline: three storylines across four chapters">
          <div aria-hidden="true" className={`${GRID} mb-2.5 ${MONO_LABEL}`}>
            <span />
            {['CH 01', 'CH 02', 'CH 03', 'CH 04'].map((ch) => (
              <span key={ch}>{ch}</span>
            ))}
          </div>
          <div aria-hidden="true" className={GRID}>
            {LANES.map(({ label, tone, cells }) => (
              <LaneRow key={label} label={label} chip={CHIP[tone]} cells={cells} />
            ))}
          </div>
        </div>
      </HudPanel>
    </section>
  )
}

function LaneRow({ label, chip, cells }: { label: string; chip: string; cells: (string | null)[] }) {
  return (
    <>
      <span className={`${MONO_LABEL} self-center`}>{label}</span>
      {cells.map((title, i) =>
        title ? (
          <span key={i} className={`border-l-3 px-2.5 py-[9px] text-[14px] ${chip}`}>
            {title}
          </span>
        ) : (
          <span key={i} />
        )
      )}
    </>
  )
}

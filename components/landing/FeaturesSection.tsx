import type { ThemeFrames } from '@/lib/themes'
import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { BAND, BODY, CONTAINER, H2, H3, SECTION_EYEBROW, SPLIT, SPLIT_TEXT } from './layout'

type Frames = ThemeFrames | null

// Each feature: a label, a heading, a paragraph and three short points, with
// a picture of that part of the app beside it.
function FeatureRow({
  label,
  labelTone,
  title,
  body,
  points,
  pointTone,
  className,
  children,
}: {
  label: string
  labelTone: string
  title: string
  body: string
  points: string[]
  pointTone: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`${SPLIT} gap-y-10 ${className ?? ''}`}>
      <div className={SPLIT_TEXT}>
        <p className={`mb-3.5 font-mono text-[12px] uppercase ${labelTone}`}>{label}</p>
        <h3 className={H3}>{title}</h3>
        <p className={`mb-5 ${BODY}`}>{body}</p>
        <ul className="flex flex-col gap-2 font-mono text-[14px] text-secondary-foreground">
          {points.map((point) => (
            <li key={point}>
              <span aria-hidden="true" className={pointTone}>›</span> {point}
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  )
}

const VISUAL = 'min-w-0 max-w-[560px] flex-[1_1_480px]'

export function FeaturesSection({ frames }: { frames: Frames }) {
  return (
    <section id="features" className={BAND}>
      <div className={`${CONTAINER} py-[104px]`}>
        <Eyebrow number="02" className={SECTION_EYEBROW}>Features</Eyebrow>
        <h2 className={`mb-[72px] ${H2}`}>Everything in its place</h2>

        <FeatureRow
          label="Timeline + Outline"
          labelTone="text-(--hud-pink-soft)"
          title="See the plot, then write it"
          body="Lay out events by chapter and storyline on the timeline grid, then draft in an outline editor with real book fonts and images that wrap around your text."
          points={['Grid and flow views', 'Filter by character, place or storyline', 'Edits backed up as you type']}
          pointTone="text-accent"
          className="mb-[104px]"
        >
          <OutlinePicture frames={frames} />
        </FeatureRow>

        <FeatureRow
          label="Characters + Places"
          labelTone="text-accent-2"
          title="Know who everyone is to everyone"
          body="Give each character a color, a role and notes, and map how they're related on family tree canvases. Keep every place with its cover image and description."
          points={['Relationship maps and family trees', 'Places with cover images', 'Linked to every event they appear in']}
          pointTone="text-accent-2"
          className="mb-[104px]"
        >
          <CharacterPicture frames={frames} />
        </FeatureRow>

        <FeatureRow
          label="Exports"
          labelTone="text-(--hud-pink-soft)"
          title="Take it with you"
          body="Export your manuscript as a book-style PDF or Word file, or a story bible with every character, place and event in one reference document. Preview it before you download."
          points={['Book style at A4 or 6×9', 'Story bible with a contents page', 'Storyboard as PDF or images']}
          pointTone="text-accent"
        >
          <ExportsPicture frames={frames} />
        </FeatureRow>
      </div>
    </section>
  )
}

function OutlinePicture({ frames }: { frames: Frames }) {
  return (
    <div role="img" aria-label="A chapter in the outline editor, 2,481 words, saved" className={VISUAL}>
      <ThemeFrame frames={frames} name="primary" className="w-full">
        <ThemeFrameSlot frames={frames} frame="primary" className="flex flex-col justify-between gap-2 overflow-hidden">
          <p className="font-mono text-[11px] text-accent-2 uppercase">Chapter 03 · The Flood</p>
          <p className="font-serif text-[15px] leading-[1.6] text-foreground">
            The river took the old bridge at dawn. Tobin was on it, halfway across, when the first plank gave.
          </p>
          {/* Right-aligned: the frame has a notch at the bottom left. */}
          <p className="text-right font-mono text-[11px] text-muted-foreground uppercase">2,481 words · Saved ✓</p>
        </ThemeFrameSlot>
      </ThemeFrame>
    </div>
  )
}

const RELATIONS = [
  { name: 'Mira Varn', kind: 'Parent', tone: 'text-accent-2' },
  { name: 'Kit Varn', kind: 'Sibling', tone: 'text-accent-2' },
  { name: 'Tobin Hale', kind: 'Mentor', tone: 'text-accent-2' },
  { name: 'Merrow Docks', kind: 'Hometown', tone: 'text-(--hud-pink-soft)' },
]

function CharacterPicture({ frames }: { frames: Frames }) {
  return (
    <div
      role="img"
      aria-label="A character, Ilsa Varn, protagonist, with her relationships: Mira Varn, parent; Kit Varn, sibling; Tobin Hale, mentor; and her hometown, Merrow Docks"
      className={`${VISUAL} flex flex-wrap items-stretch gap-5`}
    >
      <ThemeFrame frames={frames} name="portrait" className="w-[200px] flex-[0_0_200px]" plainClassName="justify-center">
        <ThemeFrameSlot frames={frames} frame="portrait" className="flex flex-col items-center justify-center gap-1.5 text-center">
          {/* 54px inside its 2px border, as in the mockup. */}
          <span className="flex size-[58px] items-center justify-center border-2 border-accent-2 text-[22px] font-bold text-accent-2">IV</span>
          <span className="mt-2 text-[17px] font-bold tracking-[1px] text-primary uppercase">Ilsa Varn</span>
          <span className="font-mono text-[11px] text-(--hud-pink-soft) uppercase">Protagonist</span>
        </ThemeFrameSlot>
      </ThemeFrame>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col justify-center rounded-xl corner-cut border border-input bg-card px-[26px] py-[22px]">
        <p className="mb-3.5 font-mono text-[11px] text-muted-foreground uppercase">Relationships</p>
        <ul className="flex flex-col gap-3 text-[16px]">
          {RELATIONS.map(({ name, kind, tone }) => (
            <li key={name} className="flex justify-between gap-3">
              <span className="text-foreground">{name}</span>
              <span className={`font-mono text-[12px] uppercase ${tone}`}>{kind}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Icons drawn on a 24px grid, stroked in the plate's tone.
const EXPORTS = [
  { name: 'Manuscript', meta: 'Book · 6×9 · PDF', tone: 'text-accent-2', icon: 'M6 3h9l4 4v14H6z M14 3v5h5' },
  { name: 'Story bible', meta: 'Cast · Places · Events', tone: 'text-(--hud-pink-soft)', icon: 'M5 4h6v16H5z M13 4h6v16h-6z' },
  { name: 'Storyboard', meta: 'PDF · Images', tone: 'text-(--hud-violet-soft)', icon: 'M3 5h8v6H3z M13 5h8v6h-8z M3 13h8v6H3z M13 13h8v6h-8z' },
]

function ExportsPicture({ frames }: { frames: Frames }) {
  return (
    <div
      role="img"
      aria-label="Three exports: the manuscript as a 6×9 book PDF, a story bible of the cast, places and events, and the storyboard as PDF or images"
      className={`${VISUAL} flex flex-col gap-3.5`}
    >
      {EXPORTS.map(({ name, meta, tone, icon }) => (
        <ThemeFrame key={name} frames={frames} name="plate" plainClassName="flex-row items-center gap-4 px-5 py-4">
          <ThemeFrameSlot frames={frames} frame="plate" slot="icon" plainClassName="size-6 shrink-0">
            <svg viewBox="0 0 24 24" className={`size-full ${tone}`}>
              <path d={icon} fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </ThemeFrameSlot>
          <ThemeFrameSlot frames={frames} frame="plate" className="flex items-center justify-between gap-3" plainClassName="min-w-0 flex-1">
            <span className="text-[17px] font-semibold text-primary">{name}</span>
            <span className={`font-mono text-[12px] uppercase ${tone}`}>{meta}</span>
          </ThemeFrameSlot>
        </ThemeFrame>
      ))}
    </div>
  )
}

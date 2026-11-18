import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { CHAPTER, CHARACTER, EXPORTS, FEATURES, OUTLINE } from '../content'
import { CONTAINER } from '../layout'
import { BAND, BODY, H2, H3, SECTION_EYEBROW, SPLIT, SPLIT_TEXT, featureLabel, sectionNumber } from './styles'

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
  label: readonly string[]
  labelTone: string
  title: string
  body: string
  points: readonly string[]
  pointTone: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-reveal className={`${SPLIT} gap-y-10 ${className ?? ''}`}>
      <div className={SPLIT_TEXT}>
        <p className={`mb-3.5 font-mono text-[12px] uppercase ${labelTone}`}>{featureLabel(label)}</p>
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

export function FeaturesSection() {
  return (
    <section id="features" className={BAND}>
      <div className={`${CONTAINER} py-[104px]`}>
        <div data-reveal>
          <Eyebrow number={sectionNumber(FEATURES.number)} className={SECTION_EYEBROW}>{FEATURES.label}</Eyebrow>
          <h2 className={`mb-[72px] ${H2}`}>{FEATURES.title}</h2>
        </div>

        <FeatureRow
          {...FEATURES.rows.outline}
          labelTone="text-(--hud-pink-soft)"
          pointTone="text-accent"
          className="mb-[104px]"
        >
          <OutlinePicture />
        </FeatureRow>

        <FeatureRow
          {...FEATURES.rows.characters}
          labelTone="text-accent-2"
          pointTone="text-accent-2"
          className="mb-[104px]"
        >
          <CharacterPicture />
        </FeatureRow>

        <FeatureRow
          {...FEATURES.rows.exports}
          labelTone="text-(--hud-pink-soft)"
          pointTone="text-accent"
        >
          <ExportsPicture />
        </FeatureRow>
      </div>
    </section>
  )
}

function OutlinePicture() {
  return (
    <div role="img" aria-label="A chapter in the outline editor, 2,481 words, saved" className={VISUAL}>
      <ThemeFrame name="primary" className="w-full">
        <ThemeFrameSlot frame="primary" className="flex flex-col justify-between gap-2 overflow-hidden">
          <p className="font-mono text-[11px] text-accent-2 uppercase">{`Chapter ${sectionNumber(CHAPTER.number)} · ${CHAPTER.title}`}</p>
          <p className="font-serif text-[15px] leading-[1.6] text-foreground">{OUTLINE.text}</p>
          {/* Right-aligned: the frame has a notch at the bottom left. */}
          <p className="text-right font-mono text-[11px] text-muted-foreground uppercase">{`${OUTLINE.words} words · Saved ✓`}</p>
        </ThemeFrameSlot>
      </ThemeFrame>
    </div>
  )
}

// People in cyan, the hometown in pink.
const RELATIONS = [
  ...CHARACTER.relations.map((r) => ({ ...r, tone: 'text-accent-2' })),
  { name: CHARACTER.hometown, kind: 'Hometown', tone: 'text-(--hud-pink-soft)' },
]

function CharacterPicture() {
  return (
    <div
      role="img"
      aria-label="A character, Ilsa Varn, protagonist, with her relationships: Mira Varn, parent; Kit Varn, sibling; Tobin Hale, mentor; and her hometown, Merrow Docks"
      className={`${VISUAL} flex flex-wrap items-stretch gap-5`}
    >
      <ThemeFrame name="portrait" className="w-[200px] flex-[0_0_200px] plain:justify-center">
        <ThemeFrameSlot frame="portrait" className="flex flex-col items-center justify-center gap-1.5 text-center">
          {/* 54px inside its 2px border, as in the mockup. */}
          <span className="flex size-[58px] items-center justify-center border-2 border-accent-2 text-[22px] font-bold text-accent-2">{CHARACTER.initials}</span>
          <span className="mt-2 text-[17px] font-bold tracking-[1px] text-primary uppercase">{CHARACTER.name}</span>
          <span className="font-mono text-[11px] text-(--hud-pink-soft) uppercase">{CHARACTER.role}</span>
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

// Each export's plate: its tone, and an icon drawn on a 24px grid, stroked
// in that tone. In EXPORTS order.
const PLATES = [
  { tone: 'text-accent-2', icon: 'M6 3h9l4 4v14H6z M14 3v5h5' },
  { tone: 'text-(--hud-pink-soft)', icon: 'M5 4h6v16H5z M13 4h6v16h-6z' },
  { tone: 'text-(--hud-violet-soft)', icon: 'M3 5h8v6H3z M13 5h8v6h-8z M3 13h8v6H3z M13 13h8v6h-8z' },
]

function ExportsPicture() {
  return (
    <div
      role="img"
      aria-label="Three exports: the manuscript as a 6×9 book PDF, a story bible of the cast, places and events, and the storyboard as PDF or images"
      className={`${VISUAL} flex flex-col gap-3.5`}
    >
      {EXPORTS.map(({ name, meta }, i) => {
        const { tone, icon } = PLATES[i]
        return (
          <ThemeFrame key={name} name="plate" className="plain:flex-row plain:items-center plain:gap-4 plain:px-5 plain:py-4">
            <ThemeFrameSlot frame="plate" slot="icon" className="plain:size-6 plain:shrink-0">
              <svg viewBox="0 0 24 24" className={`size-full ${tone}`}>
                <path d={icon} fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </ThemeFrameSlot>
            <ThemeFrameSlot frame="plate" className="flex items-center justify-between gap-3 plain:min-w-0 plain:flex-1">
              <span className="text-[17px] font-semibold text-primary">{name}</span>
              <span className={`font-mono text-[12px] uppercase ${tone}`}>{meta}</span>
            </ThemeFrameSlot>
          </ThemeFrame>
        )
      })}
    </div>
  )
}

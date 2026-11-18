import { CHAPTER, CHARACTER, EXPORTS, FEATURES, OUTLINE } from '../content'
import { CONTAINER } from '../layout'
import { Fleuron } from './Fleuron'
import { EYEBROW, H2, H3, HEADING, ITALIC_EYEBROW, LABEL, SHEET, SPLIT, featureLabel, numberWord, roman } from './styles'

// Each feature: an italic label, a heading, a paragraph and three short
// points marked with an oxblood ❧, with a picture of that part of the app
// beside it.
function FeatureRow({
  label,
  title,
  body,
  points,
  className,
  children,
}: {
  label: readonly string[]
  title: string
  body: string
  points: readonly string[]
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-reveal className={`${SPLIT} ${className ?? ''}`}>
      <div className="min-w-0 flex-[1_1_400px]">
        <p className={`mb-2 text-[19px] ${ITALIC_EYEBROW}`}>{featureLabel(label)}</p>
        <h3 className={H3}>{title}</h3>
        <p className="mb-5 text-[17px] leading-[1.75]">{body}</p>
        <ul className="text-[16px] leading-[2]">
          {points.map((point) => (
            <li key={point}>
              <span aria-hidden="true" className="text-accent">{'❧ '}</span>
              {point}
            </li>
          ))}
        </ul>
      </div>
      {children}
    </div>
  )
}

const VISUAL = 'min-w-0 max-w-[580px] flex-[1_1_480px]'

export function FeaturesSection() {
  return (
    <section id="features" className={`${CONTAINER} pt-[100px]`}>
      <div data-reveal className="mb-16 text-center">
        <p className={`mb-3.5 ${EYEBROW}`}>{`Chapter ${roman(FEATURES.number)} · ${FEATURES.label}`}</p>
        <h2 className={`mb-3.5 ${H2}`}>{FEATURES.title}</h2>
        <Fleuron className="inline-block" />
      </div>

      <FeatureRow {...FEATURES.rows.outline} className="mb-[110px]">
        <OutlinePicture />
      </FeatureRow>
      <FeatureRow {...FEATURES.rows.characters} className="mb-[110px]">
        <CharacterPicture />
      </FeatureRow>
      <FeatureRow {...FEATURES.rows.exports}>
        <ExportsPicture />
      </FeatureRow>
    </section>
  )
}

// A manuscript page: the chapter's heading, a small fleuron, the opening
// with an oxblood drop cap, and the word count.
function OutlinePicture() {
  const [first, rest] = [OUTLINE.text.charAt(0), OUTLINE.text.slice(1)]
  return (
    <div
      role="img"
      aria-label={`An outline page: chapter ${CHAPTER.number}, ${CHAPTER.title}, with its first paragraph, ${OUTLINE.words} words, saved`}
      className={`${VISUAL} px-[46px] pt-10 pb-[22px] ${SHEET}`}
    >
      <p className={`mb-1.5 text-center ${LABEL}`}>{`Chapter ${numberWord(CHAPTER.number)}`}</p>
      <p className={`mb-1.5 text-center text-[34px] ${HEADING}`}>{CHAPTER.title}</p>
      <div className="mb-[22px] text-center">
        <svg aria-hidden="true" width="90" height="10" viewBox="0 0 90 10" className="inline-block">
          <path d="M0 5H36M54 5H90" className="stroke-[hsl(var(--rule))]" />
          <circle cx="45" cy="5" r="3" className="fill-accent" />
        </svg>
      </div>
      <p className="mb-[22px] text-[17px] leading-[1.85] text-foreground">
        <span className="float-left pt-1.5 pr-2 font-heading text-[66px] leading-[0.8] font-semibold text-accent">{first}</span>
        {rest}
      </p>
      <div className="clear-both flex justify-end gap-4 border-t border-[hsl(var(--rule-light))] pt-3">
        <span className="font-mono text-[13px] text-muted-foreground">{`${OUTLINE.words} words`}</span>
        <span className="font-mono text-[13px] font-bold text-accent-3">Saved ✓</span>
      </div>
    </div>
  )
}

// A cameo portrait card, and a relationships card with dotted leaders.
function CharacterPicture() {
  const relations = CHARACTER.relations.map((r) => `${r.name}, ${r.kind.toLowerCase()}`).join('; ')
  return (
    <div
      role="img"
      aria-label={`${CHARACTER.name}, ${CHARACTER.role.toLowerCase()}. Relationships: ${relations}. Hometown: ${CHARACTER.hometown}`}
      className={`${VISUAL} flex flex-wrap items-start gap-5`}
    >
      <div className={`flex-[0_1_200px] px-5 pt-[26px] pb-[22px] text-center ${SHEET}`}>
        <svg aria-hidden="true" width="132" height="160" viewBox="0 0 132 160" className="mx-auto mb-3 block">
          <ellipse cx="66" cy="80" rx="62" ry="76" strokeWidth="2" className="fill-background stroke-[hsl(var(--rule))]" />
          <ellipse cx="66" cy="80" rx="54" ry="68" strokeWidth="1.5" className="fill-[hsl(var(--index-card))] stroke-accent" />
          <text x="66" y="96" textAnchor="middle" className="fill-accent font-heading text-[46px] font-semibold italic">
            {CHARACTER.initials}
          </text>
        </svg>
        <p className={`mb-1 text-[25px] ${HEADING}`}>{CHARACTER.name}</p>
        <p className={LABEL}>{CHARACTER.role}</p>
      </div>
      <div className={`min-w-0 flex-[1_1_260px] px-6 py-[22px] ${SHEET}`}>
        <p className={`mb-3 ${LABEL}`}>Relationships</p>
        <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2 gap-y-2.5 text-[16px] text-foreground">
          {CHARACTER.relations.map(({ name, kind }) => (
            <div key={name} className="contents">
              <span>{name}</span>
              <span className="border-b border-dotted border-[hsl(var(--rule))]" />
              <span className="font-heading text-[18px] lowercase italic text-muted-foreground">{kind}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-[hsl(var(--rule-light))] pt-3.5">
          <span className="text-[16px] text-foreground">{CHARACTER.hometown}</span>
          <span className={LABEL}>Hometown</span>
        </div>
      </div>
    </div>
  )
}

// Each export as a cloth-bound book with a gilt frame, in EXPORTS order:
// its cloth and height.
const BOOKS = [
  { cloth: 'bg-[hsl(var(--cloth-1))]', height: 'h-[220px]' },
  { cloth: 'bg-[hsl(var(--cloth-2))]', height: 'h-[240px]' },
  { cloth: 'bg-[hsl(var(--cloth-3))]', height: 'h-[208px]' },
]

function ExportsPicture() {
  return (
    <div
      role="img"
      aria-label="Three exports shown as bound books: the manuscript, a book-style 6×9 PDF; the story bible, its cast, places and events; the storyboard, as PDF or images"
      className={`${VISUAL} flex flex-wrap items-end justify-center gap-[22px]`}
    >
      {EXPORTS.map(({ name, meta }, i) => (
        <div
          key={name}
          className={`flex w-[156px] rounded-[2px_5px_5px_2px] pt-4 pr-3.5 pb-4 pl-[22px] [box-shadow:var(--book-shadow)] ${BOOKS[i].cloth} ${BOOKS[i].height}`}
        >
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 border border-[hsl(var(--gilt))] p-2.5 text-center text-[hsl(var(--gilt-text))]">
            <span className="font-heading text-[23px] font-semibold italic">{name}</span>
            <span className="font-mono text-[10px] uppercase tracking-[1px]">{meta}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

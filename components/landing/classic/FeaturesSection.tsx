import { CHAPTER, CHARACTER, EXPORTS, FEATURES, OUTLINE } from '../content'
import { CONTAINER } from '../layout'
import { CARD, EYEBROW, H2, H3, MOCK_LABEL, SPLIT, STRONG, TAG, TAG_BLUE, TAG_NEUTRAL, TAG_PAD, featureLabel } from './styles'

// Each feature: a label, a heading, a paragraph and three short points
// marked with a small taupe square, with a picture of that part of the app
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
    <div className={`${SPLIT} ${className ?? ''}`}>
      <div className="min-w-0 flex-[1_1_400px]">
        <p className={EYEBROW}>{featureLabel(label)}</p>
        <h3 className={H3}>{title}</h3>
        <p className="mb-5 text-[17px] leading-[1.75]">{body}</p>
        <ul className="text-[16px] leading-[2.1] font-semibold">
          {points.map((point) => (
            <li key={point}>
              <span aria-hidden="true" className="mr-2.5 inline-block size-1.5 rounded-[1.5px] bg-[hsl(var(--taupe))] align-middle" />
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
      <div className="mb-16 text-center">
        <p className={EYEBROW}>{FEATURES.label}</p>
        <h2 className={H2}>{FEATURES.title}</h2>
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

// An outline page: the chapter, its opening in a book serif, the word count.
function OutlinePicture() {
  return (
    <div
      role="img"
      aria-label={`An outline page: chapter ${CHAPTER.number}, ${CHAPTER.title}, with its first paragraph, ${OUTLINE.words} words, saved`}
      className={`${VISUAL} px-10 pt-[34px] pb-[22px] ${CARD}`}
    >
      <p className={`mb-1 ${MOCK_LABEL}`}>{`Chapter ${CHAPTER.number}`}</p>
      <p className={`mb-[18px] text-[30px] ${STRONG}`}>{CHAPTER.title}</p>
      <p className="mb-[22px] font-serif text-[18px] leading-[1.8] text-foreground">{OUTLINE.text}</p>
      <div className="flex justify-end gap-4 border-t border-border pt-3 text-[14px] font-bold">
        <span className="text-muted-foreground">{`${OUTLINE.words} words`}</span>
        <span className="text-foreground">Saved ✓</span>
      </div>
    </div>
  )
}

const SMALL_TAG = `${TAG} px-3 py-1`

// Ilsa's card with her round avatar, beside her relationships.
function CharacterPicture() {
  const relations = CHARACTER.relations.map((r) => `${r.name}, ${r.kind.toLowerCase()}`).join('; ')
  return (
    <div
      role="img"
      aria-label={`${CHARACTER.name}, ${CHARACTER.role.toLowerCase()}. Relationships: ${relations}. Hometown: ${CHARACTER.hometown}`}
      className={`${VISUAL} flex flex-wrap items-start gap-[18px]`}
    >
      {/* Bases from the mockup's content-box sizing: 200px + padding and
          border here, 260px + padding and border for the relationships. */}
      <div className={`flex-[0_1_242px] px-5 pt-[26px] pb-[22px] text-center ${CARD}`}>
        <div className={`mx-auto mb-3.5 flex size-24 items-center justify-center rounded-full text-[34px] font-extrabold ${TAG_BLUE}`}>
          {CHARACTER.initials}
        </div>
        <p className={`mb-2 text-[22px] ${STRONG}`}>{CHARACTER.name}</p>
        <span className={`${TAG} ${TAG_PAD} ${TAG_NEUTRAL}`}>{CHARACTER.role}</span>
      </div>
      <div className={`min-w-0 flex-[1_1_310px] px-6 py-[22px] ${CARD}`}>
        <p className={`mb-3.5 ${MOCK_LABEL}`}>Relationships</p>
        <div className="grid grid-cols-[1fr_auto] items-center gap-y-3 text-[16px] font-bold text-foreground">
          {CHARACTER.relations.map(({ name, kind }) => (
            <div key={name} className="contents">
              <span>{name}</span>
              <span className={`${SMALL_TAG} ${TAG_NEUTRAL}`}>{kind}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-3.5">
          <span className="text-[16px] font-bold text-foreground">{CHARACTER.hometown}</span>
          <span className={`${SMALL_TAG} ${TAG_BLUE}`}>Hometown</span>
        </div>
      </div>
    </div>
  )
}

// Each export's file icon fill, in EXPORTS order: blue, taupe, and the
// neutral tag for the storyboard's grid of panels.
const FILES = ['bg-[hsl(var(--tag-blue))]', 'bg-[hsl(var(--taupe))]', 'bg-[hsl(var(--tag-neutral))]']
const FILE_LINE = 'absolute left-2.5 h-1 rounded-[2px] bg-card'

function ExportsPicture() {
  return (
    <div
      role="img"
      aria-label="Three exports: the manuscript, a book-style 6×9 PDF; the story bible, its cast, places and events; the storyboard, as PDF or images"
      className={`${VISUAL} grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4`}
    >
      {EXPORTS.map(({ name, meta }, i) => (
        <div key={name} className={`flex flex-col gap-3 px-[18px] py-[22px] ${CARD}`}>
          {i < 2 ? (
            <div className={`relative h-[58px] w-[46px] rounded-[8px] ${FILES[i]}`}>
              <span className={`${FILE_LINE} top-3.5 right-2.5`} />
              <span className={`${FILE_LINE} top-6 right-4`} />
            </div>
          ) : (
            <div className={`grid h-[58px] w-[46px] grid-cols-2 gap-1 rounded-[8px] p-2 ${FILES[i]}`}>
              {[0, 1, 2, 3].map((k) => (
                <span key={k} className="rounded-[3px] bg-card" />
              ))}
            </div>
          )}
          <span className={`text-[19px] ${STRONG}`}>{name}</span>
          <span className="text-[13px] font-bold text-muted-foreground">{meta}</span>
        </div>
      ))}
    </div>
  )
}

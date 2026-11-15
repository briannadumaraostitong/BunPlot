import { ABOUT, PROJECT } from '../content'
import { CONTAINER } from '../layout'
import { CARD, EYEBROW, H2, STRONG, TAG, TAG_BLUE, TAG_NEUTRAL, TAG_PAD } from './styles'

// The summary card's three tags, blue, neutral, blue.
const STATS = [
  { text: `${PROJECT.chapters} chapters`, fill: TAG_BLUE },
  { text: `${PROJECT.events} events`, fill: TAG_NEUTRAL },
  { text: `${PROJECT.characters} characters`, fill: TAG_BLUE },
]

export function AboutSection() {
  return (
    <section id="about" className={`${CONTAINER} flex flex-wrap items-center gap-14 pt-[120px] pb-[110px]`}>
      <div className="min-w-0 flex-[1_1_520px]">
        <p className={EYEBROW}>{ABOUT.label}</p>
        <h2 className={`mb-[26px] ${H2}`}>{ABOUT.title}</h2>
        <div className={`px-9 pt-8 pb-7 ${CARD}`}>
          <p className="mb-[18px] text-[18px] leading-[1.8] text-foreground">{ABOUT.body}</p>
          <p className={`text-[18px] ${STRONG}`}>{ABOUT.signature}</p>
        </div>
      </div>

      <div className="min-w-0 max-w-[400px] flex-[1_1_320px]">
        <div
          role="img"
          aria-label={`Project summary: ${PROJECT.title}, ${PROJECT.chapters} chapters, ${PROJECT.events} events, ${PROJECT.characters} characters, ${ABOUT.status}`}
          className={`px-[26px] py-6 ${CARD}`}
        >
          <p className={`mb-4 text-[20px] ${STRONG}`}>{PROJECT.title}</p>
          <div className="mb-[18px] flex flex-wrap gap-2">
            {STATS.map(({ text, fill }) => (
              <span key={text} className={`${TAG} ${TAG_PAD} ${fill}`}>{text}</span>
            ))}
          </div>
          {/* The status in sentence case: the shared copy is lowercase. */}
          <p className="text-[15px] font-extrabold text-muted-foreground first-letter:uppercase">{`${ABOUT.status} ✓`}</p>
        </div>
      </div>
    </section>
  )
}

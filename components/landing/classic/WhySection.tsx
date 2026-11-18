import { CHAPTER, WHY } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { CARD, EYEBROW, H2, MOCK_LABEL, STRONG, TAG, TAG_BLUE, TAG_NEUTRAL, TAG_PAD } from './styles'

const NEUTRAL = `${TAG} ${TAG_PAD} ${TAG_NEUTRAL}`

export function WhySection() {
  return (
    <section id="why" className={`${CONTAINER} flex flex-wrap items-center gap-14 pt-[120px] pb-10`}>
      <div data-reveal className="min-w-0 flex-[1_1_420px]">
        <p className={EYEBROW}>{WHY.label}</p>
        <h2 className={`mb-[22px] ${H2}`}>{WHY.title}</h2>
        <p className="mb-4 max-w-[520px] text-[18px] leading-[1.75]">{WHY.body[0]}</p>
        <p className="max-w-[520px] text-[18px] leading-[1.75]">{WHY.body[1]}</p>
      </div>

      <div data-reveal className="min-w-0 max-w-[520px] flex-[1_1_440px]">
        {/* A picture of the event dialog, not a working one. */}
        <div
          role="img"
          aria-label={`An event card for ${WHY.event.title}, in chapter ${CHAPTER.number}, with ${WHY.event.characters.replace(', ', ' and ')} at ${WHY.event.place}, ${WHY.event.status.toLowerCase()}`}
          className={`px-7 pt-[26px] pb-6 ${CARD}`}
        >
          <div className="mb-[18px] flex items-center justify-between gap-3">
            <span className={`text-[26px] ${STRONG}`}>{WHY.event.title}</span>
            <span className={`${TAG} ${TAG_PAD} ${TAG_BLUE}`}>{WHY.event.status}</span>
          </div>
          <div className="grid grid-cols-[110px_1fr] items-center gap-y-3.5 text-[16px]">
            <span className={MOCK_LABEL}>Chapter</span>
            <span className="font-bold text-foreground">{`${CHAPTER.number} · ${CHAPTER.title}`}</span>
            <span className={MOCK_LABEL}>Characters</span>
            <span className="flex flex-wrap gap-1.5">
              {WHY.event.characters.split(', ').map((name) => (
                <span key={name} className={NEUTRAL}>{name}</span>
              ))}
            </span>
            <span className={MOCK_LABEL}>Place</span>
            <span>
              <span className={NEUTRAL}>{WHY.event.place}</span>
            </span>
          </div>
          <div className="mt-6 flex justify-end gap-2.5">
            <span className="px-3.5 py-2.5 text-[15px] font-extrabold text-muted-foreground">{WHY.event.close}</span>
            <span className={CTA.small}>{WHY.event.open}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

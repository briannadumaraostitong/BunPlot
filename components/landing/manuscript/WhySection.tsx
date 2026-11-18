import { CHAPTER, WHY } from '../content'
import { CONTAINER } from '../layout'
import { CTA } from './cta'
import { EYEBROW, H2, HEADING, LABEL, RULED, SHEET, SPLIT, roman } from './styles'

const FIELDS = [
  { label: 'Chapter', value: `${roman(CHAPTER.number)} · ${CHAPTER.title}` },
  { label: 'Characters', value: WHY.event.characters },
  { label: 'Place', value: WHY.event.place },
]

export function WhySection() {
  return (
    <section id="why" className={`${CONTAINER} ${SPLIT} pt-[120px] pb-10`}>
      <div data-reveal className="min-w-0 flex-[1_1_420px]">
        <p className={`mb-3.5 ${EYEBROW}`}>{`Chapter ${roman(WHY.number)} · ${WHY.label}`}</p>
        <h2 className={`mb-[22px] ${H2}`}>{WHY.title}</h2>
        <p className="mb-4 max-w-[520px] text-[18px] leading-[1.75]">{WHY.body[0]}</p>
        <p className="max-w-[520px] text-[18px] leading-[1.75]">{WHY.body[1]}</p>
      </div>

      <div data-reveal className="relative min-w-0 max-w-[520px] flex-[1_1_440px] pt-3.5">
        {/* The paperclip over the card's top edge, at the right, where
            nothing is written under it (the stamp sits lower). */}
        <svg aria-hidden="true" width="26" height="64" viewBox="0 0 26 64" className="absolute top-0 right-16 z-2">
          <path d="M8 52V12a5 5 0 0 1 10 0v40a8 8 0 0 1-16 0V16" fill="none" className="stroke-[hsl(var(--paperclip))]" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        {/* A picture of the event card, not a working one. */}
        <div
          role="img"
          aria-label={`An event card for ${WHY.event.title}, in chapter ${CHAPTER.number}, with ${WHY.event.characters.replace(', ', ' and ')} at ${WHY.event.place}, marked ${WHY.event.status.toLowerCase()}`}
          className={`relative border-t-3 border-t-accent px-[30px] pt-[26px] pb-6 ${SHEET} ${RULED}`}
        >
          <p className={`mb-0.5 ${LABEL}`}>Event</p>
          <p className={`mb-3.5 text-[32px] leading-[1.1] italic ${HEADING}`}>{WHY.event.title}</p>
          <div className="grid grid-cols-[120px_1fr] text-[16px] leading-7">
            {FIELDS.map(({ label, value }) => (
              <div key={label} className="contents">
                <span className={`${LABEL} leading-7`}>{label}</span>
                <span className="text-foreground">{value}</span>
              </div>
            ))}
          </div>
          {/* The rubber stamp, over the card's right side. On phones the
              field values and the paperclip fill that side, so it's stamped
              under the fields instead, in the flow. */}
          <div
            aria-hidden="true"
            className="mt-5 ml-1 inline-block -rotate-9 rounded-(--radius) border-2 border-accent px-3 py-1 font-mono text-[18px] font-bold uppercase tracking-[3px] text-accent opacity-85 sm:absolute sm:top-[70px] sm:right-[26px] sm:mt-0 sm:ml-0"
          >
            {WHY.event.status}
          </div>
          <div className="mt-[22px] flex justify-end gap-3">
            <span className="px-3.5 py-2.5 text-[15px] text-accent-2">{WHY.event.close}</span>
            <span className={CTA.small}>{WHY.event.open}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

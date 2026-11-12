import { ABOUT, PROJECT } from '../content'
import { CONTAINER } from '../layout'
import { EYEBROW, H2, SHEET, SPLIT, roman } from './styles'

export function AboutSection() {
  return (
    <section id="about" className={`${CONTAINER} ${SPLIT} pt-[120px] pb-[110px]`}>
      <div className="min-w-0 flex-[1_1_520px]">
        <p className={`mb-3.5 ${EYEBROW}`}>{`Chapter ${roman(ABOUT.number)} · ${ABOUT.label}`}</p>
        <h2 className={`mb-[26px] ${H2}`}>{ABOUT.title}</h2>
        {/* A letter, signed and sealed. */}
        <div className={`relative px-10 pt-[34px] pb-[30px] ${SHEET}`}>
          <p className="mb-3 font-heading text-[26px] italic text-[hsl(var(--heading-ink))]">Dear writer,</p>
          <p className="mb-[18px] text-[17px] leading-[1.8] text-foreground">{ABOUT.body}</p>
          <p className="font-heading text-[28px] italic text-accent">{ABOUT.signature}</p>
          <svg aria-hidden="true" width="78" height="78" viewBox="0 0 78 78" className="absolute right-[30px] bottom-[-22px]">
            <path
              d="M39 3c6 0 8 4 13 5s10 0 13 5 0 9 3 13 7 7 6 13-6 7-6 13 3 10-1 14-9 2-13 5-6 7-13 7-8-4-13-5-10 0-13-5 0-9-3-13-7-7-6-13 6-7 6-13-3-10 1-14 9-2 13-5 6-7 13-7z"
              className="fill-accent"
            />
            <circle cx="39" cy="39" r="22" fill="none" strokeWidth="2" className="stroke-[hsl(var(--seal-ring))]" />
            <text x="39" y="49" textAnchor="middle" className="fill-[hsl(var(--seal-letter))] font-heading text-[30px] font-bold italic">
              {ABOUT.signature.charAt(0)}
            </text>
          </svg>
        </div>
      </div>

      <div className="min-w-0 max-w-[400px] flex-[1_1_320px]">
        {/* A library catalog card, with its punched hole. */}
        <div
          role="img"
          aria-label={`A catalog card: open project, ${PROJECT.chapters} chapters, ${PROJECT.events} events, ${PROJECT.characters} characters; status, ${ABOUT.status}`}
          className={`relative border-t-3 border-t-accent-2 px-[26px] pt-[22px] pb-[46px] font-mono text-[14px] text-foreground ${SHEET}`}
        >
          <p className="mb-1 text-muted-foreground">Project no. 1</p>
          <p className="mb-4 text-[16px] font-bold">{PROJECT.title}</p>
          <p className="mb-1">{`${PROJECT.chapters} chapters · ${PROJECT.events} events`}</p>
          <p className="mb-4">{`${PROJECT.characters} characters`}</p>
          <p className="text-accent-3">{`Status: ${ABOUT.status}.`}</p>
          <span aria-hidden="true" className="absolute bottom-3.5 left-1/2 -ml-2 size-4 rounded-full border border-border bg-background" />
        </div>
      </div>
    </section>
  )
}

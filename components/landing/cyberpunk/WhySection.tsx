import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { CHAPTER, WHY } from '../content'
import { CONTAINER } from '../layout'
import { BODY, H2, SECTION_EYEBROW, SPLIT, SPLIT_TEXT, sectionNumber } from './styles'

const FIELDS = [
  { label: 'Chapter', value: `${sectionNumber(CHAPTER.number)} · ${CHAPTER.title}`, tone: 'text-foreground' },
  { label: 'Characters', value: WHY.event.characters, tone: 'text-accent-2' },
  { label: 'Place', value: WHY.event.place, tone: 'text-accent-2' },
  { label: 'Status', value: WHY.event.status, tone: 'text-(--hud-pink-soft)' },
]

const BUTTON = 'corner-cut-sm inline-block px-[22px] py-3 font-mono text-[12px] tracking-[1px] uppercase'

export function WhySection() {
  return (
    <section id="why" className={`${CONTAINER} ${SPLIT} gap-y-12 py-[104px]`}>
      <div data-reveal className={SPLIT_TEXT}>
        <Eyebrow number={sectionNumber(WHY.number)} className={SECTION_EYEBROW}>{WHY.label}</Eyebrow>
        <h2 className={`mb-5 ${H2}`}>{WHY.title}</h2>
        <p className={`mb-4 ${BODY}`}>{WHY.body[0]}</p>
        <p className={`${BODY} text-foreground`}>{WHY.body[1]}</p>
      </div>

      {/* A picture of the event dialog, not a working one. */}
      <div
        data-reveal
        role="img"
        aria-label="An event in BunPlot: Bridge falls, in chapter 3, with Ilsa Varn and Tobin Hale at Merrow Docks, drafted"
        className="min-w-0 max-w-[560px] flex-[1_1_480px]"
      >
        <ThemeFrame name="modal" className="w-full">
          <ThemeFrameSlot
            frame="modal"
            slot="title"
            className="flex items-center font-mono text-[12px] tracking-[1px] text-foreground uppercase plain:border-b plain:border-border plain:pb-3"
          >
            {`Event · ${WHY.event.title}`}
          </ThemeFrameSlot>
          <ThemeFrameSlot frame="modal" className="grid grid-cols-[104px_minmax(0,1fr)] content-center gap-x-3.5 gap-y-2 text-[15px]">
            {FIELDS.map(({ label, value, tone }) => (
              <div key={label} className="contents">
                <span className="self-center font-mono text-[11px] text-muted-foreground uppercase">{label}</span>
                <span className={tone}>{value}</span>
              </div>
            ))}
          </ThemeFrameSlot>
          <ThemeFrameSlot frame="modal" slot="actions" className="flex justify-between gap-3">
            <span className={`${BUTTON} border border-accent-2 bg-(--hud-button) text-secondary-foreground`}>{WHY.event.close}</span>
            <span className={`${BUTTON} bg-(--hud-button-primary) font-medium text-(--hud-button-primary-text)`}>{WHY.event.open}</span>
          </ThemeFrameSlot>
        </ThemeFrame>
      </div>
    </section>
  )
}

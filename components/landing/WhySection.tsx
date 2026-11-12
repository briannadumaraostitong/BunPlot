import { Eyebrow } from '@/components/hud/Eyebrow'
import { ThemeFrame, ThemeFrameSlot } from '@/components/hud/ThemeFrame'
import { BODY, CONTAINER, H2, SECTION_EYEBROW, SPLIT, SPLIT_TEXT } from './layout'

const FIELDS = [
  { label: 'Chapter', value: '03 · The Flood', tone: 'text-foreground' },
  { label: 'Characters', value: 'Ilsa Varn, Tobin Hale', tone: 'text-accent-2' },
  { label: 'Place', value: 'Merrow Docks', tone: 'text-accent-2' },
  { label: 'Status', value: 'Drafted', tone: 'text-(--hud-pink-soft)' },
]

const BUTTON = 'corner-cut-sm inline-block px-[22px] py-3 font-mono text-[12px] tracking-[1px] uppercase'

export function WhySection() {
  return (
    <section id="why" className={`${CONTAINER} ${SPLIT} gap-y-12 py-[104px]`}>
      <div className={SPLIT_TEXT}>
        <Eyebrow number="01" className={SECTION_EYEBROW}>Why BunPlot</Eyebrow>
        <h2 className={`mb-5 ${H2}`}>Your story is everywhere</h2>
        <p className={`mb-4 ${BODY}`}>
          Character notes in one doc. The timeline in a spreadsheet. Places in your head. Chapter plans on sticky notes.
        </p>
        <p className={`${BODY} text-foreground`}>
          BunPlot puts it all in one place and links it together: every event knows its chapter, who is in it and where it
          happens.
        </p>
      </div>

      {/* A picture of the event dialog, not a working one. */}
      <div
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
            Event · Bridge falls
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
            <span className={`${BUTTON} border border-accent-2 bg-(--hud-button) text-secondary-foreground`}>Close</span>
            <span className={`${BUTTON} bg-(--hud-button-primary) font-medium text-(--hud-button-primary-text)`}>Open in timeline</span>
          </ThemeFrameSlot>
        </ThemeFrame>
      </div>
    </section>
  )
}

import { ALSO } from '../content'
import { CONTAINER } from '../layout'
import { CARD, EYEBROW, HEADING, TAG_BLUE, TAG_NEUTRAL } from './styles'

// Each card's icon, drawn on a 24px grid, on a tile alternating blue and
// neutral. In ALSO.items order.
const ICONS = [
  {
    tile: TAG_BLUE,
    icon: (
      <>
        <path d="M4 20l4-1 11-11-3-3L5 16z" strokeLinejoin="round" />
        <path d="M14 6l3 3" />
      </>
    ),
  },
  {
    tile: TAG_NEUTRAL,
    icon: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-4.5-4.5" />
      </>
    ),
  },
  {
    tile: TAG_BLUE,
    icon: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinejoin="round" />,
  },
  {
    tile: TAG_NEUTRAL,
    icon: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2.5" />
        <path d="M11 17h2" />
      </>
    ),
  },
]

export function AlsoSection() {
  return (
    <section aria-labelledby="also-title" className={`${CONTAINER} pt-[120px]`}>
      <p className={EYEBROW}>{ALSO.label}</p>
      <h2 id="also-title" className={`mb-8 text-[36px] ${HEADING}`}>And a few more things</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[18px]">
        {ALSO.items.map(({ title, body }, i) => (
          <div key={title} data-reveal className={`p-[22px] ${CARD}`}>
            <div aria-hidden="true" className={`mb-3.5 flex size-[42px] items-center justify-center rounded-[9px] ${ICONS[i].tile}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {ICONS[i].icon}
              </svg>
            </div>
            <h3 className={`mb-1.5 text-[21px] ${HEADING}`}>{title}</h3>
            <p className="text-[15px] leading-[1.6]">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

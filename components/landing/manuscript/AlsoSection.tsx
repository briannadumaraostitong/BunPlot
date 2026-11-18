import { ALSO } from '../content'
import { CONTAINER } from '../layout'
import { EYEBROW, HEADING, RULED, SHEET } from './styles'

// Ruled index cards on the desk, each slightly tilted (the landing page
// only, never the app) under a top rule in a storyline color. In
// ALSO.items order.
const CARDS = [
  'border-t-accent -rotate-[0.6deg]',
  'border-t-accent-2 rotate-[0.5deg]',
  'border-t-accent-3 -rotate-[0.4deg]',
  'border-t-accent rotate-[0.6deg]',
]

export function AlsoSection() {
  return (
    <section aria-labelledby="also-title" className={`${CONTAINER} pt-[120px]`}>
      <p className={`mb-2.5 ${EYEBROW}`}>{ALSO.label}</p>
      <h2 id="also-title" className={`mb-9 text-[38px] ${HEADING}`}>The rest of the desk</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[22px]">
        {ALSO.items.map(({ title, body }, i) => (
          <div key={title} data-reveal className={`border-t-3 px-[22px] pt-5 pb-[18px] ${SHEET} ${RULED} ${CARDS[i]}`}>
            <h3 className={`mb-1.5 text-[25px] ${HEADING}`}>{title}</h3>
            <p className="text-[15px] leading-7">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

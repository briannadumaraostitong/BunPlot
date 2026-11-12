import { APP_PARTS } from '../content'
import { CONTAINER } from '../layout'
import { roman } from './styles'

// The banner as a contents line: "I. Timeline … VI. Exports", oxblood
// numerals and italic names. Full-bleed like every theme's banner: the
// darker paper band and its double rules span the page, the items stay in
// the content column, the first at its left edge and the last at its right.
export function ContentsBanner() {
  return (
    <section
      aria-label="Parts of BunPlot"
      className="border-y-3 border-double border-y-[hsl(var(--rule))] bg-sidebar/55"
    >
      <ul className={`${CONTAINER} flex flex-wrap justify-between gap-x-6 gap-y-2.5 py-4`}>
        {APP_PARTS.map((part, i) => (
          <li key={part} className="font-heading text-[21px] text-foreground">
            <span className="font-bold text-accent">{`${roman(i + 1)}.`}</span> <span className="italic">{part}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

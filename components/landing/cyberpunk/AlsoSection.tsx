import { Eyebrow } from '@/components/hud/Eyebrow'
import { ALSO } from '../content'
import { CONTAINER } from '../layout'

// Each card's top edge, in ALSO.items order, as --edge, which its top rule
// draws in (and brightens on hover, motion.css).
const EDGES = [
  '[--edge:hsl(var(--accent))]',
  '[--edge:hsl(var(--accent-2))]',
  '[--edge:hsl(var(--accent-3))]',
  '[--edge:hsl(var(--accent))]',
]

export function AlsoSection() {
  return (
    <section aria-labelledby="also-heading" className={`${CONTAINER} pt-24 pb-[104px]`}>
      <Eyebrow className="mb-7 tracking-normal">
        <span id="also-heading">{ALSO.label}</span>
      </Eyebrow>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
        {ALSO.items.map(({ title, body }, i) => (
          // The wrapper isn't clipped, so the hover glow (a drop-shadow on it,
          // motion.css) follows the card's notched outline uncut.
          <div key={title} data-reveal className="cyberpunk-also">
            {/* --cut-bw: the chamfer's border line matches the 2px top edge. */}
            <div className={`cyberpunk-also-card h-full rounded-xl corner-cut border-t-2 border-t-(--edge) bg-card px-[26px] pt-[26px] pb-7 [--cut-bw:2px] ${EDGES[i]}`}>
              <h3 className="mb-2.5 font-heading text-[21px] font-semibold text-primary">{title}</h3>
              <p className="text-[16px] leading-[1.6] text-(--hud-text-body)">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

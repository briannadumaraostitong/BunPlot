import { Eyebrow } from '@/components/hud/Eyebrow'
import { ALSO } from '../content'
import { CONTAINER } from '../layout'

// Each card's top edge, in ALSO.items order.
const EDGES = ['border-t-accent', 'border-t-accent-2', 'border-t-accent-3', 'border-t-accent']

export function AlsoSection() {
  return (
    <section aria-labelledby="also-heading" className={`${CONTAINER} pt-24 pb-[104px]`}>
      <Eyebrow className="mb-7 tracking-normal">
        <span id="also-heading">{ALSO.label}</span>
      </Eyebrow>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
        {ALSO.items.map(({ title, body }, i) => (
          // --cut-bw: the chamfer's border line matches the 2px top edge.
          <div key={title} data-reveal className={`rounded-xl corner-cut border-t-2 bg-card px-[26px] pt-[26px] pb-7 [--cut-bw:2px] ${EDGES[i]}`}>
            <h3 className="mb-2.5 font-heading text-[21px] font-semibold text-primary">{title}</h3>
            <p className="text-[16px] leading-[1.6] text-(--hud-text-body)">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

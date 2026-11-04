import { Eyebrow } from '@/components/hud/Eyebrow'
import { CONTAINER } from './layout'

const ITEMS = [
  { title: 'Storyboard', body: 'Sketch panels for each chapter with a built-in drawing tool.', edge: 'border-t-accent' },
  { title: 'Search', body: 'Find any event, character, place or line across every project.', edge: 'border-t-accent-2' },
  { title: 'Folders and projects', body: 'Keep separate books and series apart, each with its own cover.', edge: 'border-t-accent-3' },
  { title: 'On your phone', body: 'Drag, rename and write on a touch screen when an idea hits.', edge: 'border-t-accent' },
]

export function AlsoSection() {
  return (
    <section aria-labelledby="also-heading" className={`${CONTAINER} pt-24 pb-[104px]`}>
      <Eyebrow className="mb-7 tracking-normal">
        <span id="also-heading">Also in BunPlot</span>
      </Eyebrow>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5">
        {ITEMS.map(({ title, body, edge }) => (
          // --cut-bw: the chamfer's border line matches the 2px top edge.
          <div key={title} className={`rounded-xl corner-cut border-t-2 bg-card px-[26px] pt-[26px] pb-7 [--cut-bw:2px] ${edge}`}>
            <h3 className="mb-2.5 text-[21px] font-semibold text-primary">{title}</h3>
            <p className="text-[16px] leading-[1.6] text-(--hud-text-body)">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

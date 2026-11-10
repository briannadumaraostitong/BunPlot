import { cn } from '@/lib/utils'

// A full-bleed strip of mono labels, each after an accent ▸: the bar and its
// lines span the page edge to edge, a 3px accent line on top and a 2px
// accent-2 line at the bottom. `contentClassName` sets the items' column
// (the landing page passes its CONTAINER); they run edge to edge within it,
// with no inset of their own. In CSS because the banner SVG can't stretch to
// full width.
export function BannerStrip({
  items,
  className,
  contentClassName,
}: {
  items: string[]
  className?: string
  contentClassName?: string
}) {
  return (
    <div className={cn('border-t-3 border-b-2 border-t-accent border-b-accent-2 bg-(--hud-banner)', className)}>
      <div className={contentClassName}>
        <ul className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 py-[18px] font-mono text-[13px] uppercase tracking-[1px] text-(--hud-text-body)">
          {items.map((item) => (
            <li key={item}>
              <span aria-hidden="true" className="text-accent">▸</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

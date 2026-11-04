import { cn } from '@/lib/utils'

// A full-width strip of mono labels, each after a pink ▸: a dark bar with a
// 3px pink left edge and a 2px cyan bottom. In CSS because the banner SVG
// can't stretch to full width. Cyberpunk colors.
export function BannerStrip({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn('border-l-3 border-b-2 border-l-accent border-b-accent-2 bg-(--hud-banner)', className)}>
      <ul className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5 px-7 py-[18px] font-mono text-[13px] uppercase tracking-[1px] text-(--hud-text-body)">
        {items.map((item) => (
          <li key={item}>
            <span aria-hidden="true" className="text-accent">▸</span> {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
